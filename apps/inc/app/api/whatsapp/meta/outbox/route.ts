import { createServiceClient } from '@ksp/database';
import {
  sendMetaTextMessage,
  verifyInternalBearer,
  withinWhatsAppCustomerServiceWindow,
} from '../../../../../lib/whatsapp-meta-send';
import { whatsappWebhookRuntimeGate } from '../../../../../lib/whatsapp-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DISPATCH_BATCH_SIZE = 5;

type ServiceClient = NonNullable<ReturnType<typeof createServiceClient>>;

type OutboxRow = {
  id: string;
  organization_id: string;
  conversation_id: string;
  channel_id: string;
  attempt_count: number;
  payload: unknown;
};

type TextPayload = {
  kind: 'text';
  body: string;
};

type ChannelRow = {
  external_ref: string | null;
  provider: string;
  kind: string;
  status: string;
  outbound_enabled: boolean;
};

type ConversationRow = {
  state: string;
  identity_id: string | null;
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

function parseTextPayload(value: unknown): TextPayload | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const payload = value as { kind?: unknown; body?: unknown };
  if (payload.kind !== 'text' || typeof payload.body !== 'string') return null;
  const body = payload.body.trim();
  return body ? { kind: 'text', body } : null;
}

async function failOutbox(
  service: ServiceClient,
  row: OutboxRow,
  code: string,
) {
  await service
    .from('communication_outbox')
    .update({
      status: 'failed',
      last_error: code,
      next_attempt_at: null,
    })
    .eq('id', row.id)
    .eq('organization_id', row.organization_id)
    .eq('status', 'sending');
}

async function claimOutbox(
  service: ServiceClient,
  row: OutboxRow,
): Promise<boolean> {
  const { data, error } = await service
    .from('communication_outbox')
    .update({
      status: 'sending',
      attempt_count: row.attempt_count + 1,
      last_error: null,
    })
    .eq('id', row.id)
    .eq('organization_id', row.organization_id)
    .eq('status', 'queued')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function dispatchOne(
  service: ServiceClient,
  row: OutboxRow,
  config: { accessToken: string; graphVersion: string },
): Promise<'sent' | 'blocked' | 'failed'> {
  if (!(await claimOutbox(service, row))) return 'blocked';

  const payload = parseTextPayload(row.payload);
  if (!payload) {
    await failOutbox(service, row, 'unsupported_outbox_payload');
    return 'blocked';
  }

  const [{ data: channel, error: channelError }, { data: conversation, error: conversationError }] =
    await Promise.all([
      service
        .from('communication_channels')
        .select('external_ref,provider,kind,status,outbound_enabled')
        .eq('id', row.channel_id)
        .eq('organization_id', row.organization_id)
        .maybeSingle(),
      service
        .from('communication_conversations')
        .select('state,identity_id')
        .eq('id', row.conversation_id)
        .eq('organization_id', row.organization_id)
        .maybeSingle(),
    ]);

  if (channelError || conversationError) {
    await failOutbox(service, row, 'outbox_context_lookup_failed');
    return 'failed';
  }

  const channelRow = (channel as ChannelRow | null) ?? null;
  const conversationRow = (conversation as ConversationRow | null) ?? null;
  if (
    !channelRow ||
    channelRow.kind !== 'whatsapp' ||
    channelRow.provider !== 'meta' ||
    channelRow.status !== 'active' ||
    !channelRow.outbound_enabled ||
    !channelRow.external_ref
  ) {
    await failOutbox(service, row, 'outbound_channel_not_active');
    return 'blocked';
  }

  if (!conversationRow || conversationRow.state !== 'open' || !conversationRow.identity_id) {
    await failOutbox(service, row, 'conversation_not_open');
    return 'blocked';
  }

  const [{ data: identity, error: identityError }, { data: inbound, error: inboundError }] =
    await Promise.all([
      service
        .from('communication_identities')
        .select('id,normalized_address')
        .eq('id', conversationRow.identity_id)
        .eq('organization_id', row.organization_id)
        .eq('channel_kind', 'whatsapp')
        .maybeSingle(),
      service
        .from('communication_events')
        .select('occurred_at')
        .eq('organization_id', row.organization_id)
        .eq('conversation_id', row.conversation_id)
        .eq('direction', 'inbound')
        .in('event_type', ['message', 'attachment'])
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (identityError || inboundError) {
    await failOutbox(service, row, 'outbound_policy_lookup_failed');
    return 'failed';
  }

  const normalizedAddress =
    identity && typeof identity.normalized_address === 'string'
      ? identity.normalized_address
      : '';
  const latestInboundAt =
    inbound && typeof inbound.occurred_at === 'string' ? inbound.occurred_at : null;

  if (!normalizedAddress) {
    await failOutbox(service, row, 'recipient_identity_missing');
    return 'blocked';
  }
  if (!withinWhatsAppCustomerServiceWindow(latestInboundAt)) {
    await failOutbox(service, row, 'outside_customer_service_window');
    return 'blocked';
  }

  const sendResult = await sendMetaTextMessage({
    accessToken: config.accessToken,
    graphVersion: config.graphVersion,
    phoneNumberId: channelRow.external_ref,
    recipient: normalizedAddress,
    body: payload.body,
  });

  if (!sendResult.ok) {
    // Do not auto-requeue an ambiguous provider/transport outcome. Manual
    // reconciliation is safer than accidentally sending a duplicate message.
    await failOutbox(service, row, `meta_send_${sendResult.code}`);
    return 'failed';
  }

  const sentAt = new Date().toISOString();
  const { error: evidenceError } = await service
    .from('communication_outbox')
    .update({
      provider_message_id: sendResult.providerMessageId,
      sent_at: sentAt,
      last_error: null,
    })
    .eq('id', row.id)
    .eq('organization_id', row.organization_id)
    .eq('status', 'sending');
  if (evidenceError) return 'failed';

  const { error: eventError } = await service
    .from('communication_events')
    .insert({
      organization_id: row.organization_id,
      conversation_id: row.conversation_id,
      channel_id: row.channel_id,
      identity_id: conversationRow.identity_id,
      channel_kind: 'whatsapp',
      direction: 'outbound',
      event_type: 'message',
      provider: 'meta',
      dedupe_key: `meta:outbound:${row.id}`,
      provider_event_id: sendResult.providerMessageId,
      body: payload.body,
      occurred_at: sentAt,
      metadata: {
        source: 'communication_outbox',
        customer_service_window: true,
      },
    });
  if (eventError && eventError.code !== '23505') return 'failed';

  const { error: sentError } = await service
    .from('communication_outbox')
    .update({ status: 'sent' })
    .eq('id', row.id)
    .eq('organization_id', row.organization_id)
    .eq('status', 'sending');
  if (sentError) return 'failed';

  return 'sent';
}

export async function POST(request: Request) {
  if (!whatsappWebhookRuntimeGate(request).ok) {
    return json({ ok: false, error: 'dispatcher_unavailable' }, 503);
  }
  if (process.env.WHATSAPP_META_EXTERNAL_SENDS_ENABLED !== 'true') {
    return json({ ok: false, error: 'external_sends_disabled' }, 503);
  }

  const dispatchSecret = process.env.WHATSAPP_META_OUTBOX_SECRET?.trim() ?? '';
  if (!verifyInternalBearer(request.headers.get('authorization'), dispatchSecret)) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const accessToken = process.env.WHATSAPP_META_ACCESS_TOKEN?.trim() ?? '';
  const graphVersion = process.env.WHATSAPP_META_GRAPH_VERSION?.trim() ?? '';
  if (!accessToken || !/^v\d+\.\d+$/.test(graphVersion)) {
    return json({ ok: false, error: 'provider_not_configured' }, 503);
  }

  const service = createServiceClient();
  if (!service) {
    return json({ ok: false, error: 'database_not_configured' }, 503);
  }

  const { data, error } = await service
    .from('communication_outbox')
    .select('id,organization_id,conversation_id,channel_id,attempt_count,payload')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(DISPATCH_BATCH_SIZE);
  if (error) return json({ ok: false, error: 'outbox_lookup_failed' }, 500);

  let sent = 0;
  let blocked = 0;
  let failed = 0;

  for (const value of data ?? []) {
    const outcome = await dispatchOne(service, value as OutboxRow, {
      accessToken,
      graphVersion,
    });
    if (outcome === 'sent') sent += 1;
    else if (outcome === 'blocked') blocked += 1;
    else failed += 1;
  }

  return json({ ok: true, inspected: (data ?? []).length, sent, blocked, failed });
}
