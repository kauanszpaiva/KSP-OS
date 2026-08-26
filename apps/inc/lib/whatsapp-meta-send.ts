import { timingSafeEqual } from 'node:crypto';

const META_GRAPH_BASE_URL = 'https://graph.facebook.com';
const WHATSAPP_TEXT_MAX_LENGTH = 4096;
const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
const META_SEND_TIMEOUT_MS = 10_000;

export type WhatsAppAutomationMode = 'off' | 'observe' | 'draft' | 'autonomous';

export type MetaTextSendRequest = {
  url: string;
  body: {
    messaging_product: 'whatsapp';
    recipient_type: 'individual';
    to: string;
    type: 'text';
    text: {
      preview_url: false;
      body: string;
    };
  };
};

export type MetaTextSendResult =
  | { ok: true; providerMessageId: string }
  | {
      ok: false;
      code:
        | 'invalid_config'
        | 'timeout'
        | 'transport'
        | 'provider_rejected'
        | 'invalid_response';
    };

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function verifyInternalBearer(
  authorizationHeader: string | null,
  expectedSecret: string,
): boolean {
  if (!authorizationHeader?.startsWith('Bearer ') || !expectedSecret) return false;
  const supplied = Buffer.from(authorizationHeader.slice('Bearer '.length), 'utf8');
  const expected = Buffer.from(expectedSecret, 'utf8');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function automationModeAllowsExternalReply(input: {
  automationMode: WhatsAppAutomationMode;
  requiresHumanApproval: boolean;
  actionStatus: string;
  approvedBy: string | null;
}): boolean {
  if (input.automationMode === 'off' || input.automationMode === 'observe') {
    return false;
  }

  if (input.automationMode === 'draft') {
    return (
      input.requiresHumanApproval &&
      input.actionStatus === 'approved' &&
      Boolean(input.approvedBy)
    );
  }

  if (input.requiresHumanApproval) {
    return input.actionStatus === 'approved' && Boolean(input.approvedBy);
  }

  return input.actionStatus === 'approved' || input.actionStatus === 'queued';
}

export function withinWhatsAppCustomerServiceWindow(
  lastInboundAt: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!lastInboundAt) return false;
  const inboundMs = Date.parse(lastInboundAt);
  if (!Number.isFinite(inboundMs)) return false;
  const age = nowMs - inboundMs;
  return age >= 0 && age <= CUSTOMER_SERVICE_WINDOW_MS;
}

export function buildMetaTextSendRequest(input: {
  graphVersion: string;
  phoneNumberId: string;
  recipient: string;
  body: string;
}): MetaTextSendRequest | null {
  const graphVersion = input.graphVersion.trim();
  const phoneNumberId = digitsOnly(input.phoneNumberId);
  const recipient = digitsOnly(input.recipient);
  const body = input.body.trim();

  if (!/^v\d+\.\d+$/.test(graphVersion)) return null;
  if (!phoneNumberId || !recipient) return null;
  if (!body || body.length > WHATSAPP_TEXT_MAX_LENGTH) return null;

  return {
    url: `${META_GRAPH_BASE_URL}/${graphVersion}/${phoneNumberId}/messages`,
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: {
        preview_url: false,
        body,
      },
    },
  };
}

export async function sendMetaTextMessage(input: {
  accessToken: string;
  graphVersion: string;
  phoneNumberId: string;
  recipient: string;
  body: string;
}): Promise<MetaTextSendResult> {
  const request = buildMetaTextSendRequest(input);
  if (!request || !input.accessToken.trim()) {
    return { ok: false, code: 'invalid_config' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), META_SEND_TIMEOUT_MS);

  try {
    const response = await fetch(request.url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(request.body),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) return { ok: false, code: 'provider_rejected' };

    const payload: unknown = await response.json().catch(() => null);
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !Array.isArray((payload as { messages?: unknown }).messages)
    ) {
      return { ok: false, code: 'invalid_response' };
    }

    const first = (payload as { messages: unknown[] }).messages[0];
    if (
      typeof first !== 'object' ||
      first === null ||
      typeof (first as { id?: unknown }).id !== 'string' ||
      !(first as { id: string }).id
    ) {
      return { ok: false, code: 'invalid_response' };
    }

    return { ok: true, providerMessageId: (first as { id: string }).id };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, code: 'timeout' };
    }
    return { ok: false, code: 'transport' };
  } finally {
    clearTimeout(timeout);
  }
}
