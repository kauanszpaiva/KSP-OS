import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@6.0.2";

type SignupBody = {
  token?: string;
  email?: string;
  password?: string;
};

type InvitationRow = {
  id: string;
  email: string;
  expires_at: string;
  revoked_at: string | null;
  accepted_at: string | null;
};

const PORTAL_ORIGIN = "https://kspdominionportal.com";
const INVITE_TOKEN_RE = /^[0-9a-f]{64}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (origin === PORTAL_ORIGIN || origin === "https://www.kspdominionportal.com") return origin;
  if (origin === "http://localhost:3000" || origin === "http://localhost:3001" || origin === "http://localhost:3002") return origin;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol === "https:" && parsed.hostname.endsWith(".vercel.app")) return origin;
  } catch {
    return null;
  }
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

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function confirmationUrl(tokenHash: string, inviteToken: string): string {
  const url = new URL("/auth/confirm", PORTAL_ORIGIN);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "signup");
  url.searchParams.set("next", `/invite/${inviteToken}`);
  return url.toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    if (req.headers.get("Origin") && !allowedOrigin(req.headers.get("Origin"))) {
      return json(req, { ok: false, error: "origin_not_allowed" }, 403);
    }
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") return json(req, { ok: false, error: "method_not_allowed" }, 405);

  const requestOrigin = req.headers.get("Origin");
  if (requestOrigin && !allowedOrigin(requestOrigin)) {
    return json(req, { ok: false, error: "origin_not_allowed" }, 403);
  }

  let body: SignupBody;
  try {
    body = await req.json();
  } catch {
    return json(req, { ok: false, error: "invalid_request" }, 400);
  }

  const inviteToken = String(body.token || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!INVITE_TOKEN_RE.test(inviteToken) || !EMAIL_RE.test(email) || password.length < 8 || password.length > 128) {
    return json(req, { ok: false, error: "invalid_request" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json(req, { ok: false, error: "signup_relay_unavailable" }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const inviteTokenHash = await sha256Hex(inviteToken);
  const { data: invitationData, error: invitationError } = await admin
    .from("portal_invitations")
    .select("id, email, expires_at, revoked_at, accepted_at")
    .or(`token_hash.eq.${inviteTokenHash},email_token_hash.eq.${inviteTokenHash}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const invitation = invitationData as InvitationRow | null;
  const invitationReady =
    !invitationError &&
    invitation &&
    !invitation.revoked_at &&
    !invitation.accepted_at &&
    Date.parse(invitation.expires_at) > Date.now() &&
    invitation.email.trim().toLowerCase() === email;

  if (!invitationReady) {
    return json(req, { ok: false, error: "invitation_not_available" }, 400);
  }

  // Create the user explicitly first. This makes rollback ownership unambiguous:
  // if this call fails because the email already exists, the relay never mutates
  // or deletes that pre-existing account.
  const { data: createdData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
  });

  if (createError || !createdData?.user?.id) {
    return json(req, { ok: false, error: "account_could_not_be_created" }, 409);
  }

  const createdUserId = createdData.user.id;

  const rollbackCreatedUser = async () => {
    const { error } = await admin.auth.admin.deleteUser(createdUserId);
    if (error) {
      console.error("KSP portal invite signup rollback failed", {
        invitation_id: invitation.id,
        user_id: createdUserId,
        message: error.message,
      });
    }
  };

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { redirectTo: `${PORTAL_ORIGIN}/invite/${inviteToken}` },
  });

  if (linkError || !linkData.properties?.hashed_token) {
    await rollbackCreatedUser();
    return json(req, { ok: false, error: "confirmation_link_unavailable" }, 503);
  }

  const { data: resendKeyData, error: resendKeyError } = await admin.rpc("ksp_get_resend_api_key");
  const resendKey = typeof resendKeyData === "string" ? resendKeyData.trim() : "";

  if (resendKeyError || resendKey.length < 10) {
    await rollbackCreatedUser();
    return json(req, { ok: false, error: "confirmation_email_unavailable" }, 503);
  }

  const resend = new Resend(resendKey);
  const actionUrl = confirmationUrl(linkData.properties.hashed_token, inviteToken);

  try {
    const { data: sent, error: sendError } = await resend.emails.send(
      {
        from: "KSP OS <notifications@mail.kspdominion.group>",
        to: [email],
        replyTo: "kauan@kspdominion.group",
        template: {
          id: "ksp-auth-confirm-signup",
          variables: { ACTION_URL: actionUrl },
        },
      },
      { idempotencyKey: `ksp-auth/portal-invite-signup/${invitation.id}/${createdUserId}`.slice(0, 240) },
    );

    if (sendError || !sent?.id) throw new Error("confirmation_email_delivery_failed");
  } catch {
    await rollbackCreatedUser();
    return json(req, { ok: false, error: "confirmation_email_unavailable" }, 503);
  }

  return json(req, { ok: true, requires_confirmation: true }, 200);
});
