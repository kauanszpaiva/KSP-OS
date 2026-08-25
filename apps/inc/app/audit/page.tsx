import { IncShell, ownerRoleLabel } from "../../components/inc-shell";
import { OwnerList, OwnerPageHeader } from "../../components/owner-surface";
import { getAuditRows } from "../../lib/inc-data";
import { requireIncOwner } from "../../lib/inc-session";
import { getServerSupabase } from "../../lib/supabase";

export default async function IncAuditPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const rows = supabase ? await getAuditRows(supabase) : [];

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="Control evidence"
        title="Audit"
        description="Recent privileged and operational evidence from the canonical audit stream."
        aside="Owner access does not remove accountability. INC should make privileged actions easier to inspect, not less visible."
      />
      <section className="section">
        <div className="sectionHeader">
          <h2>Recent audit events</h2>
          <p>Newest first</p>
        </div>
        <OwnerList rows={rows} empty="No audit events were returned." />
      </section>
    </IncShell>
  );
}
