import { IncShell, ownerRoleLabel } from "../../components/inc-shell";
import { OwnerList, OwnerPageHeader, SurfaceStatus } from "../../components/owner-surface";
import { getAccessRows } from "../../lib/inc-data";
import { requireIncOwner } from "../../lib/inc-session";
import { getServerSupabase } from "../../lib/supabase";

export default async function IncAccessPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const rows = supabase ? await getAccessRows(supabase) : [];

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="Authorization"
        title="Access"
        description="Effective access evidence across vertical membership, permanent permissions and temporary grants."
        aside="INC is the owner control plane. Command, Portal and Network remain separate persona boundaries rather than alternate admin modes."
      />
      <SurfaceStatus
        title="Temporary writes are still gated"
        body="Temporary-access mutations remain read-only here until the broader temporary-grant RLS mutation boundary is narrowed and regression-tested."
        tone="attention"
      />
      <section className="section">
        <div className="sectionHeader">
          <h2>Effective entitlement evidence</h2>
          <p>Business units · permissions · temporary grants</p>
        </div>
        <OwnerList rows={rows} empty="No access rows were returned, or the newer access tables are not promoted in this environment." />
      </section>
    </IncShell>
  );
}
