import type { SupabaseClient } from '@ksp/database';
import type { ListRow, MetricState } from './inc-data';

const metricSpecs = [
  ['communication_channels', 'WhatsApp connections'],
  ['communication_conversations', 'WhatsApp conversations'],
  ['communication_events', 'WhatsApp events'],
  ['communication_outbox', 'WhatsApp delivery queue']
] as const;

async function scopedCount(
  supabase: SupabaseClient,
  organizationId: string,
  table: string,
  label: string
): Promise<MetricState> {
  let query = supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (table === 'communication_channels') query = query.eq('kind', 'whatsapp');
  if (table === 'communication_conversations') query = query.eq('primary_channel', 'whatsapp');
  if (table === 'communication_events') query = query.eq('channel_kind', 'whatsapp');

  const { count, error } = await query;

  return {
    label,
    value: error ? null : (count ?? 0),
    note: error ? 'Schema not promoted in this environment' : table
  };
}

export async function getWhatsAppDashboard(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{
  schemaReady: boolean;
  metrics: MetricState[];
  channels: ListRow[];
  conversations: ListRow[];
}> {
  const metrics = await Promise.all(
    metricSpecs.map(([table, label]) => scopedCount(supabase, organizationId, table, label))
  );

  const schemaReady = metrics.every((metric) => metric.value !== null);
  if (!schemaReady) {
    return { schemaReady: false, metrics, channels: [], conversations: [] };
  }

  const [channelResult, conversationResult] = await Promise.all([
    supabase
      .from('communication_channels')
      .select('id,channel_key,kind,provider,status,inbound_enabled,outbound_enabled')
      .eq('organization_id', organizationId)
      .eq('kind', 'whatsapp')
      .order('created_at', { ascending: true }),
    supabase
      .from('communication_conversations')
      .select('id,scope,primary_channel,state,summary,assigned_agent_key,last_event_at')
      .eq('organization_id', organizationId)
      .eq('primary_channel', 'whatsapp')
      .order('last_event_at', { ascending: false, nullsFirst: false })
      .limit(40)
  ]);

  const channels: ListRow[] = channelResult.error
    ? []
    : (channelResult.data ?? []).map((row: any) => ({
        id: String(row.id),
        primary: `WHATSAPP · ${row.provider}`,
        secondary: `${row.status} · inbound ${row.inbound_enabled ? 'on' : 'off'} · outbound ${row.outbound_enabled ? 'on' : 'off'}`,
        meta: row.channel_key
      }));

  const conversations: ListRow[] = conversationResult.error
    ? []
    : (conversationResult.data ?? []).map((row: any) => ({
        id: String(row.id),
        primary: row.summary || 'WhatsApp conversation',
        secondary: `${row.scope} · ${row.state}`,
        meta: row.assigned_agent_key
          ? `${row.assigned_agent_key}${row.last_event_at ? ` · ${row.last_event_at}` : ''}`
          : row.last_event_at || undefined
      }));

  return { schemaReady: true, metrics, channels, conversations };
}
