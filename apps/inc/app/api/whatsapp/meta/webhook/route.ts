import { createServiceClient } from '@ksp/database';
import {
  META_WEBHOOK_MAX_BYTES,
  META_WHATSAPP_PROVIDER,
  normalizeMetaWebhook,
  verifyMetaWebhookChallenge,
  verifyMetaWebhookSignature,
  type NormalizedWhatsAppMessage,
  type NormalizedWhatsAppStatus,
} from '../../../../../lib/whatsapp-meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_EVENTS_PER_WEBHOOK = 50;

type ServiceClient = NonNullable<ReturnType<typeof createServiceClient>>;

type ChannelRow = {
  id: string;
  organization_id: string;
  automation_mode: 'off' | 'observe' | 'draft' | 'autonomous';
};

type IdentityRow = {
  id: string;
  contact_id: string | null;
  metadata: Record<string, unknown> | null;
};

type ConversationRow = {
  id: string;
  state: 'open' | 'human_handoff' | 'waiting' | 'closed' | 'blocked';
};

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

function metaSecrets() {
  const verifyToken = process.env.WHATSAPP_META_VERIFY_TOKEN?.trim() ?? '';
  const appSecret = process.env.WHATSAPP_META_APP_SECRET?.trim() ?? '';
  return { verifyToken, appSecret };
}

async function resolveChannel(
  service: ServiceClient,
  phoneNumberId: string,
): Promise<ChannelRow | null> {
  const { data, error } = await service
    .from('communication_channels')
    .select('id,organization_id,automation_mode')
    .eq('kind', 'whatsapp')
    .eq('provider', META_WHATSAPP_PROVIDER)
    .eq('external_ref', phoneNumberId)
    .eq('status', 'active')
    .eq('inbound_enabled', true)
    .maybeSingle();

  if (error) throw error;
  return (data as ChannelRow | null) ?? null;
}

async function resolveIdentity(
  service: ServiceClient,
  channel: ChannelRow,
  event: NormalizedWhatsAppMessage,
): Promise<IdentityRow> {
  const { data: existing, error: readError } = await service
    .from('communication_identities')
    .select('id,contact_id,metadata')
    .eq('organization_id', channel.organization_id)
    .eq('channel_kind', 'whatsapp')
    .eq('normalized_address', event.from)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) {
    const row = existing as IdentityRow;
    if (event.displayName) {
      const metadata = {
        ...(row.metadata ?? {}),
        whatsapp_profile_name: event.displayName,
      };
      const { error: updateError } = await service
        .from('communication_identities')
        .update({ display_address: event.from, metadata, updated_at: new Date().toISOString() })
        .eq('id', row.id)
        .eq('organization_id', channel.organization_id);
      if (updateError) throw updateError;
      return { ...row, metadata };
    }
    return row;
  }

  const { data: exactContact, error: contactError } = await service
    .from('contacts')
    .select('id')
    .eq('organization_id', channel.organization_id)
    .eq('phone', event.from)
    .limit(1)
    .maybeSingle();
  if (contactError) throw contactError;

  const { data: created, error: insertError } = await service
    .from('communication_identities')
    .insert({
      organization_id: channel.organization_id,
      contact_id: exactContact?.id ?? null,
      channel_kind: 'whatsapp',
      normalized_address: event.from,
      display_address: event.from,
      verified: true,
      metadata: event.displayName
        ? { whatsapp_profile_name: event.displayName }
        : {},
    })
    .select('id,contact_id,metadata')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: raced, error: racedError } = await service
        .from('communication_identities')
        .select('id,contact_id,metadata')
        .eq('organization_id', channel.organization_id)
        .eq('channel_kind', 'whatsapp')
        .eq('normalized_address', event.from)
        .single();
      if (racedError) throw racedError;
      return raced as IdentityRow;
    }
    throw insertError;
  }
  return created as IdentityRow;
}

async function resolveConversation(
  service: ServiceClient,
  channel: ChannelRow,
  identity: IdentityRow,
  occurredAt: string,
): Promise<ConversationRow> {
  const { data: existing, error: readError } = await service
    .from('communication_conversations')
    .select('id,state')
    .eq('organization_id', channel.organization_id)
    .eq('identity_id', identity.id)
    .in('state', ['open', 'human_handoff', 'waiting'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return existing as ConversationRow;

  const { data: created, error: insertError } = await service
    .from('communication_conversations')
    .insert({
      organization_id: channel.organization_id,
      identity_id: identity.id,
      contact_id: identity.contact_id,
      scope: 'prospect',
      primary_channel: 'whatsapp',
      state: 'open',
      assigned_agent_key: 'inc.whatsapp-front-desk',
      last_event_at: occurredAt,
      metadata: { source: 'meta_whatsapp_webhook' },
    })
    .select('id,state')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: raced, error: racedError } = await service
        .from('communication_conversations')
        .select('id,state')
        .eq('organization_id', channel.organization_id)
        .eq('identity_id', identity.id)
        .in('state', ['open', 'human_handoff', 'waiting'])
        .single();
      if (racedError) throw racedError;
      return raced as ConversationRow;
    }
    throw insertError;
  }
  return created as ConversationRow;
}

async function ingestMessage(
  service: ServiceClient,
  channel: ChannelRow,
  event: NormalizedWhatsAppMessage,
): Promise<'inserted' | 'duplicate'> {
  if (!event.from) return 'duplicate';
  const identity = await resolveIdentity(service, channel, event);
  const conversation = await resolveConversation(
    service,
    channel,
    identity,
    event.occurredAt,
  );
  const dedupeKey = `meta:message:${event.providerMessageId}`;

  const { data: inserted, error: eventError } = await service
    .from('communication_events')
    .insert({
      organization_id: channel.organization_id,
      conversation_id: conversation.id,
      channel_id: channel.id,
      identity_id: identity.id,
      channel_kind: 'whatsapp',
      direction: 'inbound',
      event_type: event.eventType,
      provider: META_WHATSAPP_PROVIDER,
      dedupe_key: dedupeKey,
      provider_event_id: event.providerMessageId,
      body: event.body,
      occurred_at: event.occurredAt,
      metadata: event.metadata,
    })
    .select('id')
    .single();

  if (eventError) {
    if (eventError.code === '23505') return 'duplicate';
    throw eventError;
  }

  const { error: conversationError } = await service
    .from('communication_conversations')
    .update({ last_event_at: event.occurredAt, updated_at: new Date().toISOString() })
    .eq('id', conversation.id)
    .eq('organization_id', channel.organization_id);
  if (conversationError) throw conversationError;

  if (channel.automation_mode !== 'off' && conversation.state === 'open') {
    const { error: actionError } = await service
      .from('communication_ai_actions')
      .insert({
        organization_id: channel.organization_id,
        conversation_id: conversation.id,
        source_event_id: inserted.id,
        agent_key: 'inc.whatsapp-front-desk',
        action_type: 'classify',
        status: 'proposed',
        risk_level: 'low',
        summary: `Classify inbound WhatsApp ${event.eventType} before any reply decision.`,
        requires_human_approval: channel.automation_mode !== 'autonomous',
        metadata: {
          automation_mode: channel.automation_mode,
          external_send_allowed: false,
        },
      });
    if (actionError && actionError.code !== '23505') throw actionError;
  }

  return 'inserted';
}

async function ingestStatus(
  service: ServiceClient,
  channel: ChannelRow,
  event: NormalizedWhatsAppStatus,
): Promise<'inserted' | 'duplicate' | 'ignored'> {
  const { data: outbox, error: outboxError } = await service
    .from('communication_outbox')
    .select('id,conversation_id,status')
    .eq('organization_id', channel.organization_id)
    .eq('channel_id', channel.id)
    .eq('provider_message_id', event.providerMessageId)
    .limit(1)
    .maybeSingle();
  if (outboxError) throw outboxError;
  if (!outbox) return 'ignored';

  const dedupeKey = `meta:status:${event.providerMessageId}:${event.status}:${event.occurredAt}`;
  const { error: eventError } = await service.from('communication_events').insert({
    organization_id: channel.organization_id,
    conversation_id: outbox.conversation_id,
    channel_id: channel.id,
    channel_kind: 'whatsapp',
    direction: 'system',
    event_type: 'delivery',
    provider: META_WHATSAPP_PROVIDER,
    dedupe_key: dedupeKey,
    provider_event_id: event.providerMessageId,
    body: event.status,
    occurred_at: event.occurredAt,
    metadata: event.metadata,
  });

  if (eventError) {
    if (eventError.code === '23505') return 'duplicate';
    throw eventError;
  }

  if (event.status === 'failed') {
    const { error } = await service
      .from('communication_outbox')
      .update({
        status: 'failed',
        last_error: 'meta_delivery_failed',
        next_attempt_at: null,
      })
      .eq('id', outbox.id)
      .eq('organization_id', channel.organization_id);
    if (error) throw error;
  } else if (['sent', 'delivered', 'read'].includes(event.status)) {
    const { error } = await service
      .from('communication_outbox')
      .update({ status: 'sent', sent_at: event.occurredAt, last_error: null })
      .eq('id', outbox.id)
      .eq('organization_id', channel.organization_id);
    if (error) throw error;
  }

  return 'inserted';
}

export async function GET(request: Request) {
  const { verifyToken } = metaSecrets();
  if (!verifyToken) return json({ ok: false, error: 'webhook_not_configured' }, 503);

  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge') ?? '';

  if (!verifyMetaWebhookChallenge(mode, token, verifyToken)) {
    return new Response('Forbidden', { status: 403 });
  }
  return new Response(challenge, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > META_WEBHOOK_MAX_BYTES) {
    return json({ ok: false, error: 'payload_too_large' }, 413);
  }

  const { appSecret } = metaSecrets();
  if (!appSecret) return json({ ok: false, error: 'webhook_not_configured' }, 503);

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > META_WEBHOOK_MAX_BYTES) {
    return json({ ok: false, error: 'payload_too_large' }, 413);
  }

  if (
    !verifyMetaWebhookSignature(
      rawBody,
      request.headers.get('x-hub-signature-256'),
      appSecret,
    )
  ) {
    return json({ ok: false, error: 'invalid_signature' }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const service = createServiceClient();
  if (!service) return json({ ok: false, error: 'database_not_configured' }, 503);

  const events = normalizeMetaWebhook(payload).slice(0, MAX_EVENTS_PER_WEBHOOK);
  let processed = 0;
  let duplicates = 0;
  let ignored = 0;

  try {
    for (const event of events) {
      const channel = await resolveChannel(service, event.phoneNumberId);
      if (!channel) {
        ignored += 1;
        continue;
      }
      const outcome =
        event.kind === 'message'
          ? await ingestMessage(service, channel, event)
          : await ingestStatus(service, channel, event);
      if (outcome === 'inserted') processed += 1;
      else if (outcome === 'duplicate') duplicates += 1;
      else ignored += 1;
    }
  } catch {
    return json({ ok: false, error: 'ingest_failed' }, 500);
  }

  return json({
    ok: true,
    accepted: events.length,
    processed,
    duplicates,
    ignored,
  });
}
