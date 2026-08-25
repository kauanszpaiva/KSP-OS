import { IncShell, ownerRoleLabel } from "../../components/inc-shell";
import { OwnerList, OwnerPageHeader } from "../../components/owner-surface";
import { getWorkRows } from "../../lib/inc-data";
import { requireIncOwner } from "../../lib/inc-session";
import { getServerSupabase } from "../../lib/supabase";

export default async function IncWorkPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const rows = supabase ? await getWorkRows(supabase) : [];

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="Company execution"
        title="Work"
        description="Owner-level view of KSP tasks across operating units. Owners stay in INC; authorization is still enforced by the canonical server/RLS model."
        aside="Cross-unit assignment windows expose only the exact task to a non-owner. They do not manufacture project or vertical membership."
      />
      <section className="section">
        <div className="sectionHeader">
          <h2>Company task stream</h2>
          <p>Newest first · owner scope</p>
        </div>
        <OwnerList rows={rows} empty="No owner-visible tasks were returned in this environment." />
      </section>
    </IncShell>
  );
}
