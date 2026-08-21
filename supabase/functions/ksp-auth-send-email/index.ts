import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@6.0.2";

type EmailAction =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email"
  | "reauthentication"
  | "password_changed_notification"
  | "email_changed_notification"
  | "phone_changed_notification"
  | "identity_linked_notification"
  | "identity_unlinked_notification"
  | "mfa_factor_enrolled_notification"
  | "mfa_factor_unenrolled_notification";

type HookPayload = {
  user: {
    id: string;
    email: string;
    new_email?: string;
    phone?: string;
    updated_at?: string;
  };
  email_data: {
    token?: string;
    token_hash?: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to?: string;
    site_url?: string;
    email_action_type: EmailAction;
    old_email?: string;
    old_phone?: string;
    provider?: string;
    factor_type?: string;
  };
};

const ACCOUNT_FROM = "KSP OS <notifications@mail.kspdominion.group>";
const SECURITY_FROM = "KSP OS Security <notifications@mail.kspdominion.group>";
const REPLY_TO = "kauan@kspdominion.group";

const templateFor: Record<EmailAction, string> = {
  signup: "ksp-auth-confirm-signup",
  invite: "ksp-auth-invite",
  magiclink: "ksp-auth-magic-link",
  recovery: "ksp-auth-password-recovery",
  email_change: "ksp-auth-email-change",
  email: "ksp-auth-magic-link",
  reauthentication: "ksp-auth-reauthentication",
  password_changed_notification: "ksp-auth-password-changed",
  email_changed_notification: "ksp-auth-email-changed",
  phone_changed_notification: "ksp-auth-phone-changed",
  identity_linked_notification: "ksp-auth-identity-linked",
  identity_unlinked_notification: "ksp-auth-identity-unlinked",
  mfa_factor_enrolled_notification: "ksp-auth-mfa-enrolled",
  mfa_factor_unenrolled_notification: "ksp-auth-mfa-unenrolled",
};

const securityActions = new Set<EmailAction>([
  "recovery",
  "email_change",
  "reauthentication",
  "password_changed_notification",
  "email_changed_notification",
  "phone_changed_notification",
  "identity_linked_notification",
  "identity_unlinked_notification",
  "mfa_factor_enrolled_notification",
  "mfa_factor_unenrolled_notification",
]);

function actionUrl(
  supabaseUrl: string,
  tokenHash: string | undefined,
  action: EmailAction,
  redirectTo: string | undefined,
  siteUrl: string | undefined,
) {
  if (!tokenHash) return "";
  const url = new URL(`${supabaseUrl}/auth/v1/verify`);
  url.searchParams.set("token", tokenHash);
  url.searchParams.set("type", action);
  const destination = redirectTo || siteUrl;
  if (destination) url.searchParams.set("redirect_to", destination);
  return url.toString();
}

function baseVariables(payload: HookPayload, hashOverride?: string) {
  const { user, email_data } = payload;
  const action = email_data.email_action_type;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const hash = hashOverride ?? email_data.token_hash;
  const vars: Record<string, string | number> = {};

  if (
    ["signup", "invite", "magiclink", "recovery", "email_change", "email"].includes(
      action,
    )
  ) {
    vars.ACTION_URL = actionUrl(
      supabaseUrl,
      hash,
      action,
      email_data.redirect_to,
      email_data.site_url,
    );
  }
  if (action === "magiclink" || action === "email") {
    vars.OTP_CODE = email_data.token || "";
  }
  if (action === "reauthentication") vars.OTP_CODE = email_data.token || "";
  if (action === "email_change") {
    vars.NEW_EMAIL = user.new_email || "your new email address";
  }
  if (action === "email_changed_notification") {
    vars.OLD_EMAIL = email_data.old_email || "your previous email address";
    vars.NEW_EMAIL = user.email || "your current email address";
  }
  if (action === "phone_changed_notification") {
    vars.OLD_PHONE = email_data.old_phone || "your previous phone number";
    vars.NEW_PHONE = user.phone || "your current phone number";
  }
  if (
    action === "identity_linked_notification" ||
    action === "identity_unlinked_notification"
  ) {
    vars.PROVIDER = email_data.provider || "external";
  }
  if (
    action === "mfa_factor_enrolled_notification" ||
    action === "mfa_factor_unenrolled_notification"
  ) {
    vars.FACTOR_TYPE = email_data.factor_type || "multi-factor authentication";
  }
  return vars;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 405 });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const rawHookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (!resendKey || !rawHookSecret) {
    return new Response(
      JSON.stringify({
        error: {
          http_code: 503,
          message: "email hook secrets are not configured",
        },
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const payloadText = await req.text();
  let payload: HookPayload;
  try {
    const hookSecret = rawHookSecret.replace("v1,whsec_", "");
    const wh = new Webhook(hookSecret);
    payload = wh.verify(
      payloadText,
      Object.fromEntries(req.headers),
    ) as HookPayload;
  } catch {
    return new Response(
      JSON.stringify({
        error: { http_code: 401, message: "invalid hook signature" },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const { user, email_data } = payload;
  const action = email_data.email_action_type;
  if (!templateFor[action]) {
    return new Response(
      JSON.stringify({
        error: { http_code: 400, message: "unsupported auth email action" },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const resend = new Resend(resendKey);
  const from = securityActions.has(action) ? SECURITY_FROM : ACCOUNT_FROM;

  const send = async (
    to: string,
    variables: Record<string, string | number>,
    suffix: string,
  ) => {
    const idempotencySeed =
      email_data.token_hash ||
      email_data.token_hash_new ||
      email_data.old_email ||
      email_data.old_phone ||
      email_data.provider ||
      email_data.factor_type ||
      user.updated_at ||
      "event";
    const idempotencyKey =
      `ksp-auth/${user.id}/${action}/${suffix}/${idempotencySeed}`.slice(0, 240);
    const { error } = await resend.emails.send(
      {
        from,
        to: [to],
        replyTo: REPLY_TO,
        template: { id: templateFor[action], variables },
      },
      { idempotencyKey },
    );
    if (error) throw new Error(error.message || "resend send failed");
  };

  try {
    if (action === "email_change" && user.new_email) {
      // Supabase intentionally reverses these field names for backwards compatibility:
      // token_hash_new -> current email, token_hash -> new email.
      const currentHash = email_data.token_hash_new;
      const newHash = email_data.token_hash;
      if (currentHash && newHash) {
        await send(
          user.email,
          baseVariables(payload, currentHash),
          "current-email",
        );
        await send(
          user.new_email,
          baseVariables(payload, newHash),
          "new-email",
        );
      } else {
        const availableHash = newHash || currentHash;
        await send(
          user.new_email,
          baseVariables(payload, availableHash),
          "new-email",
        );
      }
    } else {
      await send(user.email, baseVariables(payload), "primary");
    }
  } catch (error) {
    console.error("KSP auth email send failed", {
      action,
      user_id: user.id,
      message: error instanceof Error ? error.message : "unknown",
    });
    return new Response(
      JSON.stringify({
        error: { http_code: 502, message: "email provider send failed" },
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response("{}", {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
