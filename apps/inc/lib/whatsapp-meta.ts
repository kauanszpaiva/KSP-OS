import { createHmac, timingSafeEqual } from 'node:crypto';

export const META_WHATSAPP_PROVIDER = 'meta';
export const META_WEBHOOK_MAX_BYTES = 512 * 1024;

export type NormalizedWhatsAppMessage = {
  kind: 'message';
  phoneNumberId: string;
  providerMessageId: string;
  from: string;
  displayName: string | null;
  occurredAt: string;
  eventType: 'message' | 'attachment';
  body: string | null;
  metadata: Record<string, unknown>;
};

export type NormalizedWhatsAppStatus = {
  kind: 'status';
  phoneNumberId: string;
  providerMessageId: string;
  recipient: string | null;
  occurredAt: string;
  status: string;
  metadata: Record<string, unknown>;
};

export type NormalizedWhatsAppEvent =
  | NormalizedWhatsAppMessage
  | NormalizedWhatsAppStatus;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function timestampToIso(value: unknown): string {
  const raw = asString(value);
  if (!raw) return new Date(0).toISOString();
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds < 0) return new Date(0).toISOString();
  return new Date(seconds * 1000).toISOString();
}

export function normalizeWhatsAppAddress(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith('sha256=') || !appSecret) return false;
  const supplied = signatureHeader.slice('sha256='.length).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;

  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const suppliedBuffer = Buffer.from(supplied, 'hex');
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

export function verifyMetaWebhookChallenge(
  mode: string | null,
  token: string | null,
  expectedToken: string,
): boolean {
  return mode === 'subscribe' && Boolean(expectedToken) && token === expectedToken;
}

function messageBody(message: JsonObject): {
  eventType: 'message' | 'attachment';
  body: string | null;
  metadata: Record<string, unknown>;
} {
  const type = asString(message.type) ?? 'unknown';
  const context = isObject(message.context) ? message.context : null;
  const contextMessageId = context ? asString(context.id) : null;
  const baseMetadata: Record<string, unknown> = {
    message_type: type,
    ...(contextMessageId ? { context_message_id: contextMessageId } : {}),
  };

  if (type === 'text' && isObject(message.text)) {
    return {
      eventType: 'message',
      body: asString(message.text.body),
      metadata: baseMetadata,
    };
  }

  if (type === 'button' && isObject(message.button)) {
    return {
      eventType: 'message',
      body: asString(message.button.text) ?? asString(message.button.payload),
      metadata: baseMetadata,
    };
  }

  if (type === 'interactive' && isObject(message.interactive)) {
    const interactive = message.interactive;
    const buttonReply = isObject(interactive.button_reply)
      ? interactive.button_reply
      : null;
    const listReply = isObject(interactive.list_reply) ? interactive.list_reply : null;
    const reply = buttonReply ?? listReply;
    return {
      eventType: 'message',
      body: reply ? asString(reply.title) ?? asString(reply.id) : null,
      metadata: {
        ...baseMetadata,
        interactive_type: asString(interactive.type),
        ...(reply && asString(reply.id) ? { interactive_reply_id: asString(reply.id) } : {}),
      },
    };
  }

  if (type === 'location' && isObject(message.location)) {
    const latitude = message.location.latitude;
    const longitude = message.location.longitude;
    return {
      eventType: 'message',
      body: asString(message.location.name) ?? 'Location shared',
      metadata: {
        ...baseMetadata,
        ...(typeof latitude === 'number' ? { latitude } : {}),
        ...(typeof longitude === 'number' ? { longitude } : {}),
      },
    };
  }

  const attachment = isObject(message[type]) ? message[type] : null;
  if (
    ['image', 'audio', 'video', 'document', 'sticker'].includes(type) &&
    attachment
  ) {
    return {
      eventType: 'attachment',
      body: asString(attachment.caption) ?? `WhatsApp ${type}`,
      metadata: {
        ...baseMetadata,
        provider_media_id: asString(attachment.id),
        mime_type: asString(attachment.mime_type),
        filename: asString(attachment.filename),
      },
    };
  }

  return {
    eventType: 'message',
    body: null,
    metadata: baseMetadata,
  };
}

function contactName(value: JsonObject, sender: string): string | null {
  for (const item of asArray(value.contacts)) {
    if (!isObject(item) || asString(item.wa_id) !== sender) continue;
    const profile = isObject(item.profile) ? item.profile : null;
    return profile ? asString(profile.name) : null;
  }
  return null;
}

export function normalizeMetaWebhook(payload: unknown): NormalizedWhatsAppEvent[] {
  if (!isObject(payload) || payload.object !== 'whatsapp_business_account') return [];

  const normalized: NormalizedWhatsAppEvent[] = [];
  for (const entry of asArray(payload.entry)) {
    if (!isObject(entry)) continue;
    for (const change of asArray(entry.changes)) {
      if (!isObject(change) || change.field !== 'messages' || !isObject(change.value)) {
        continue;
      }
      const value = change.value;
      const metadata = isObject(value.metadata) ? value.metadata : null;
      const phoneNumberId = metadata ? asString(metadata.phone_number_id) : null;
      if (!phoneNumberId) continue;

      for (const item of asArray(value.messages)) {
        if (!isObject(item)) continue;
        const providerMessageId = asString(item.id);
        const from = asString(item.from);
        if (!providerMessageId || !from) continue;
        const content = messageBody(item);
        normalized.push({
          kind: 'message',
          phoneNumberId,
          providerMessageId,
          from: normalizeWhatsAppAddress(from),
          displayName: contactName(value, from),
          occurredAt: timestampToIso(item.timestamp),
          eventType: content.eventType,
          body: content.body,
          metadata: content.metadata,
        });
      }

      for (const item of asArray(value.statuses)) {
        if (!isObject(item)) continue;
        const providerMessageId = asString(item.id);
        const status = asString(item.status);
        if (!providerMessageId || !status) continue;
        const errors = asArray(item.errors)
          .filter(isObject)
          .map((error) => ({
            code: typeof error.code === 'number' ? error.code : null,
            title: asString(error.title),
          }));
        normalized.push({
          kind: 'status',
          phoneNumberId,
          providerMessageId,
          recipient: asString(item.recipient_id)
            ? normalizeWhatsAppAddress(String(item.recipient_id))
            : null,
          occurredAt: timestampToIso(item.timestamp),
          status,
          metadata: {
            status,
            ...(errors.length ? { errors } : {}),
          },
        });
      }
    }
  }
  return normalized;
}
