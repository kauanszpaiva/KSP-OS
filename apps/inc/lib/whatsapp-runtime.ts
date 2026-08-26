export type WhatsAppWebhookRuntimeGate =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'disabled'
        | 'missing_allowed_host'
        | 'host_mismatch'
        | 'missing_project_ref'
        | 'database_mismatch';
    };

function normalizeHost(value: string | null | undefined): string {
  return (value ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
}

function supabaseProjectRef(value: string | null | undefined): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) {
      return '';
    }
    return url.hostname.slice(0, -'.supabase.co'.length).toLowerCase();
  } catch {
    return '';
  }
}

export function evaluateWhatsAppWebhookRuntimeGate(input: {
  enabled: boolean;
  requestHost: string | null | undefined;
  allowedHost: string | null | undefined;
  supabaseUrl: string | null | undefined;
  expectedProjectRef: string | null | undefined;
}): WhatsAppWebhookRuntimeGate {
  if (!input.enabled) return { ok: false, reason: 'disabled' };

  const allowedHost = normalizeHost(input.allowedHost);
  if (!allowedHost) return { ok: false, reason: 'missing_allowed_host' };
  if (normalizeHost(input.requestHost) !== allowedHost) {
    return { ok: false, reason: 'host_mismatch' };
  }

  const expectedProjectRef = (input.expectedProjectRef ?? '').trim().toLowerCase();
  if (!expectedProjectRef) return { ok: false, reason: 'missing_project_ref' };
  if (supabaseProjectRef(input.supabaseUrl) !== expectedProjectRef) {
    return { ok: false, reason: 'database_mismatch' };
  }

  return { ok: true };
}

export function whatsappWebhookRuntimeGate(request: Request): WhatsAppWebhookRuntimeGate {
  const requestHost =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');

  return evaluateWhatsAppWebhookRuntimeGate({
    enabled: process.env.WHATSAPP_META_WEBHOOK_ENABLED === 'true',
    requestHost,
    allowedHost: process.env.WHATSAPP_META_WEBHOOK_HOST,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    expectedProjectRef: process.env.WHATSAPP_META_SUPABASE_PROJECT_REF,
  });
}
