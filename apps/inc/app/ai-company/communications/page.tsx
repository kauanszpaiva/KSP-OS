import { IncShell, ownerRoleLabel } from '../../../components/inc-shell';
import { MetricGrid, OwnerList, OwnerPageHeader, SurfaceStatus } from '../../../components/owner-surface';
import { getOmnichannelDashboard } from '../../../lib/omnichannel';
import { requireIncOwner } from '../../../lib/inc-session';
import { getServerSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export default async function IncAiCompanyCommunicationsPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const data = supabase
    ? await getOmnichannelDashboard(supabase, ctx.organizationId)
    : { schemaReady: false, metrics: [], channels: [], conversations: [] };

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="AI Company · Communication OS"
        title="Omnichannel Front Desk"
        description="One business memory for calls, SMS, WhatsApp and email. Providers transport messages; KSP owns the contact, conversation, decisions and audit history."
        aside="Inbound event → verify → dedupe → resolve contact → load shared context → policy gate → AI action or human handoff → outbox → delivery evidence."
      />
      <SurfaceStatus
        title={data.schemaReady ? 'Unified communication ledger is connected' : 'Source slice is ready; communication schema is not promoted here'}
        body={data.schemaReady
          ? 'Channels share the same KSP contact and conversation state. External provider credentials remain outside the database.'
          : 'This page fails closed until the additive communication migration is explicitly approved for this environment. No provider is activated by this source change.'}
        tone={data.schemaReady ? 'ok' : 'attention'}
      />
      {data.metrics.length > 0 ? <MetricGrid metrics={data.metrics} /> : null}
      <OwnerList rows={data.channels} empty="No communication channel has been configured in this environment." />
      <OwnerList rows={data.conversations} empty="No unified conversations have been recorded yet." />
    </IncShell>
  );
}
