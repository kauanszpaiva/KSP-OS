import { IncShell, ownerRoleLabel } from '../../../components/inc-shell';
import { MetricGrid, OwnerPageHeader, SurfaceStatus } from '../../../components/owner-surface';
import { StreamList, type StreamFacet } from '../../../components/stream-list';
import { DonutChart, Panel, StatCard, StatGrid, VisualGrid } from '../../../components/visual-data';
import { getWhatsAppDashboard } from '../../../lib/omnichannel';
import { requireIncOwner } from '../../../lib/inc-session';
import { getServerSupabase } from '../../../lib/supabase';
import { distribution, statusFacets } from '../../../lib/visual-data';

export const dynamic = 'force-dynamic';

const CHANNEL_FACET: StreamFacet = { id: 'channel', label: 'Channels', groups: ['channel'], icon: 'message' };

export default async function IncAiCompanyCommunicationsPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const data = supabase
    ? await getWhatsAppDashboard(supabase, ctx.organizationId)
    : { schemaReady: false, metrics: [], channels: [], conversations: [] };

  const stateMix = distribution(data.conversations.map((row) => row.status), {
    limit: 6,
    otherLabel: 'Other states'
  });
  const assigned = data.conversations.filter((row) => Boolean(row.meta)).length;

  return (
    <IncShell mfa={ctx.mfa} ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="AI Company · WhatsApp"
        icon="message"
        title="WhatsApp AI Front Desk"
        description="One governed AI assistant for the WhatsApp attached to the existing AT&T mobile number. KSP owns the contact, conversation memory, decisions and audit history; WhatsApp is the only communication channel in scope."
        aside="WhatsApp event → verify → dedupe → resolve contact → load KSP context → policy gate → AI reply or human handoff → delivery evidence → CRM/task update."
      />
      <SurfaceStatus
        title={data.schemaReady ? 'WhatsApp communication ledger is connected' : 'Source slice is ready; WhatsApp schema is not promoted here'}
        body={data.schemaReady
          ? 'WhatsApp conversations share the same KSP contact, lead, client and operational state. Provider credentials remain outside the database.'
          : 'This page fails closed until the additive WhatsApp communication migration is explicitly approved for this environment. No Meta/WhatsApp provider is activated by this source change.'}
        tone={data.schemaReady ? 'ok' : 'attention'}
      />

      <section className="section" aria-labelledby="whatsapp-summary">
        <div className="sectionHeader">
          <h2 id="whatsapp-summary">Channel posture</h2>
          <p>Canonical counts scoped to this organization</p>
        </div>
        <MetricGrid metrics={data.metrics} />
        <StatGrid label="WhatsApp conversation metrics">
          <StatCard icon="message" index={0} label="Conversations returned" note="Most recent 40 ordered by last event" value={data.conversations.length} />
          <StatCard icon="ai" index={1} label="Assigned to an agent" note="Rows carrying an assigned_agent_key" value={assigned} />
          <StatCard icon="clock" index={2} label="Awaiting an agent" note="Rows with no assigned agent" tone={data.conversations.length - assigned > 0 ? 'warning' : 'ok'} value={data.conversations.length - assigned} />
          <StatCard icon="server" index={3} label="Configured channels" note="WhatsApp channels in this organization" value={data.channels.length} />
        </StatGrid>
      </section>

      {data.conversations.length > 0 ? (
        <section className="section" aria-labelledby="whatsapp-visuals">
          <div className="sectionHeader">
            <h2 id="whatsapp-visuals">Conversation signals</h2>
            <p>State mix of the returned WhatsApp conversations</p>
          </div>
          <VisualGrid>
            <Panel index={0} note="Conversation state in the returned window" title="Conversation state mix">
              <DonutChart
                caption="Share of returned conversations by state"
                centerLabel="conversations"
                centerValue={String(data.conversations.length)}
                emptyLabel="No WhatsApp conversations have been recorded yet."
                items={stateMix}
              />
            </Panel>
          </VisualGrid>
        </section>
      ) : null}

      <section className="section" aria-labelledby="whatsapp-channels">
        <div className="sectionHeader">
          <h2 id="whatsapp-channels">Channels</h2>
          <p>WhatsApp connection configuration</p>
        </div>
        <StreamList
          empty="No WhatsApp connection has been configured in this environment."
          facets={[CHANNEL_FACET]}
          rows={data.channels}
          searchPlaceholder="Search provider, status or channel key"
        />
      </section>

      <section className="section" aria-labelledby="whatsapp-conversations">
        <div className="sectionHeader">
          <h2 id="whatsapp-conversations">Conversations</h2>
          <p>Newest events first · filter by state and search</p>
        </div>
        <StreamList
          empty="No WhatsApp conversations have been recorded yet."
          facets={statusFacets(data.conversations)}
          rows={data.conversations}
          searchPlaceholder="Search summary, scope, state or agent"
        />
      </section>
    </IncShell>
  );
}

