import { IncShell, ownerRoleLabel } from "../../components/inc-shell";
import { OwnerList, OwnerPageHeader, SurfaceStatus } from "../../components/owner-surface";
import { getNetworkRows } from "../../lib/inc-data";
import { requireIncOwner } from "../../lib/inc-session";
import { getServerSupabase } from "../../lib/supabase";

export default async function IncNetworkPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const rows = supabase ? await getNetworkRows(supabase) : [];

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="External operations"
        title="Network"
        description="Owner governance for subcontractors, studios and external delivery partners."
        aside="Partners stay assignment-scoped. A Network identity never inherits Command or INC access from a partner membership."
      />
      <SurfaceStatus
        title="Environment-aware"
        body="If partner tables have not been promoted in the current database, this page stays safe and empty instead of falling back to a broader internal roster."
        tone="ok"
      />
      <section className="section">
        <div className="sectionHeader">
          <h2>Partner organizations</h2>
          <p>Network boundary</p>
        </div>
        <OwnerList rows={rows} empty="Network partner tables are empty or not promoted in this environment." />
      </section>
    </IncShell>
  );
}
