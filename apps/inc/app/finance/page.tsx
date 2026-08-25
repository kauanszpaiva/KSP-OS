import { IncShell, ownerRoleLabel } from "../../components/inc-shell";
import { OwnerList, OwnerPageHeader, SurfaceStatus } from "../../components/owner-surface";
import { getFinanceRows } from "../../lib/inc-data";
import { requireIncOwner } from "../../lib/inc-session";
import { getServerSupabase } from "../../lib/supabase";

export default async function IncFinancePage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const rows = supabase ? await getFinanceRows(supabase) : [];

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="Money & approvals"
        title="Finance"
        description="Owner-level finance evidence across invoices, approvals and recurring subscriptions."
        aside="Financial mutations remain governed by their existing approval, MFA and database rules. INC does not bypass those controls."
      />
      <SurfaceStatus
        title="No duplicate finance engine"
        body="INC reads the canonical finance records. Mutation workflows will be moved behind shared domain services before Command-only actions are retired."
        tone="ok"
      />
      <section className="section">
        <div className="sectionHeader">
          <h2>Financial operating stream</h2>
          <p>Invoices · approvals · subscriptions</p>
        </div>
        <OwnerList rows={rows} empty="No finance rows were returned in this environment." />
      </section>
    </IncShell>
  );
}
