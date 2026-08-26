import { AiCompanyConsole } from '../../components/ai-company-console';
import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { OwnerPageHeader, SurfaceStatus } from '../../components/owner-surface';
import { getAiCompanyDashboard } from '../../lib/ai-company';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';

export const dynamic = 'force-dynamic';

export default async function IncAiCompanyPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const data = supabase
    ? await getAiCompanyDashboard(supabase, ctx.organizationId)
    : {
        schemaReady: false,
        agents: [],
        missions: [],
        tasks: [],
        evidence: [],
        capabilities: [],
        clients: [],
        budget: { hardCap: 50, spent: 0, available: 50, start: '2026-08-26', end: '2026-09-15' }
      };

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="KSP AI workforce"
        title="AI Company"
        description="Turn a one-sentence mission into a governed execution tree across KSP INC and every operating vertical."
        aside="SUPER ULTRA → SUPER → ULTRA → AGENT → SUB AGENT. CLIENT and INTERNAL are separate execution planes. Evidence, scope and budget are mandatory."
      />
      <SurfaceStatus
        title={data.schemaReady ? 'Runtime connected to canonical KSP state' : 'Runtime source is ready; database promotion is pending'}
        body={data.schemaReady
          ? 'Mission, task, evidence, capability and budget records are persisted in Supabase under the existing KSP INC owner boundary.'
          : 'The page fails closed until the additive owner-only AI Company migration exists in this environment.'}
        tone={data.schemaReady ? 'ok' : 'attention'}
      />
      <AiCompanyConsole data={data} />
    </IncShell>
  );
}
