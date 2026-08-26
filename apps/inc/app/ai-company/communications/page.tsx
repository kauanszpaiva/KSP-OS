import { IncShell, ownerRoleLabel } from '../../../components/inc-shell';
import { MetricGrid, OwnerList, OwnerPageHeader, SurfaceStatus } from '../../../components/owner-surface';
import { getWhatsAppDashboard } from '../../../lib/omnichannel';
import { requireIncOwner } from '../../../lib/inc-session';
import { getServerSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export default async function IncAiCompanyCommunicationsPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const data = supabase
    ? await getWhatsAppDashboard(supabase, ctx.organizationId)
    : { schemaReady: false, metrics: [], channels: [], conversations: [] };

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="AI Company · WhatsApp"
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
      {data.metrics.length > 0 ? <MetricGrid metrics={data.metrics} /> : null}
      <OwnerList rows={data.channels} empty="No WhatsApp connection has been configured in this environment." />
      <OwnerList rows={data.conversations} empty="No WhatsApp conversations have been recorded yet." />
    </IncShell>
  );
}
