import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@6.0.2";

type RecoveryBody = {
  email?: string;
};

const PORTAL_ORIGIN = "https://kspdominionportal.com";
const COMMAND_ORIGIN = "https://appkspdominion.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function allowedOrigin(origin: string | null): string | null {
  if (origin === PORTAL_ORIGIN || origin === COMMAND_ORIGIN) return origin;
  return null;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = allowedOrigin(req.headers.get("Origin"));
  return {
    "Access-Control-Allow-Origin": origin || PORTAL_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function genericSuccess(req: Request) {
  // Never reveal whether an account exists, is in cooldown, or whether delivery
  // failed for a specific address. Delivery failures remain server-observable.
  return json(req, { ok: true }, 200);
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function recoveryUrl(origin: string, tokenHash: string): string {
  const url = new URL("/auth/confirm", origin);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "recovery");
  url.searchParams.set("next", "/account/update-password");
  return url.toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    if (!allowedOrigin(req.headers.get("Origin"))) {
      return json(req, { ok: false, error: "origin_not_allowed" }, 403);
    }
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") return json(req, { ok: false, error: "method_not_allowed" }, 405);

  // The chosen origin becomes the recovery-link host, so it is intentionally
  // pinned to canonical KSP production domains. Do not broaden this to a
  // wildcard preview domain: that would let another origin receive token_hash.
  const requestOrigin = allowedOrigin(req.headers.get("Origin"));
  if (!requestOrigin) return json(req, { ok: false, error: "origin_not_allowed" }, 403);

  let body: RecoveryBody;
  try {
    body = await req.json();
  } catch {
    return genericSuccess(req);
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 320) return genericSuccess(req);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("KSP auth recovery runtime is missing required Supabase configuration");
    return genericSuccess(req);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // admin.generateLink() does not enforce the normal /recover frequency limit.
  // This service-role-only database gate checks the same recovery_sent_at field
  // before a new token is generated, preserving at least a 60-second cooldown.
  const { data: recoveryAllowed, error: cooldownError } = await admin.rpc(
    "ksp_can_generate_recovery_link",
    { p_email: email, p_cooldown_seconds: 60 },
  );
  if (cooldownError) {
    console.error("KSP auth recovery cooldown check failed");
    return genericSuccess(req);
  }
  if (recoveryAllowed !== true) return genericSuccess(req);

  // generateLink creates a native Supabase recovery token without asking GoTrue
  // to deliver email. Unknown users intentionally collapse to the same public
  // response as known users to prevent account enumeration.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${requestOrigin}/account/update-password` },
  });

  if (linkError || !linkData.properties?.hashed_token) {
    return genericSuccess(req);
  }

  const { data: resendKeyData, error: resendKeyError } = await admin.rpc("ksp_get_resend_api_key");
  const resendKey = typeof resendKeyData === "string" ? resendKeyData.trim() : "";
  if (resendKeyError || resendKey.length < 10) {
    console.error("KSP auth recovery could not load the Resend credential");
    return genericSuccess(req);
  }

  const actionUrl = recoveryUrl(requestOrigin, linkData.properties.hashed_token);
  const idempotencyDigest = await sha256Hex(`${email}:${linkData.properties.hashed_token}`);
  const resend = new Resend(resendKey);

  try {
    const { data: sent, error: sendError } = await resend.emails.send(
      {
        from: "KSP OS Security <notifications@mail.kspdominion.group>",
        to: [email],
        replyTo: "kauan@kspdominion.group",
        template: {
          id: "ksp-auth-password-recovery",
          variables: { ACTION_URL: actionUrl },
        },
      },
      { idempotencyKey: `ksp-auth/recovery/${idempotencyDigest}`.slice(0, 240) },
    );

    if (sendError || !sent?.id) {
      console.error("KSP auth recovery email delivery failed");
      return genericSuccess(req);
    }
  } catch {
    console.error("KSP auth recovery email delivery threw");
    return genericSuccess(req);
  }

  return genericSuccess(req);
});
