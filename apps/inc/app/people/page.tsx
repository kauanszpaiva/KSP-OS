import { IncShell, ownerRoleLabel } from "../../components/inc-shell";
import { OwnerList, OwnerPageHeader, SurfaceStatus } from "../../components/owner-surface";
import { getPeopleRows } from "../../lib/inc-data";
import { requireIncOwner } from "../../lib/inc-session";
import { getServerSupabase } from "../../lib/supabase";

export default async function IncPeoplePage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const rows = supabase ? await getPeopleRows(supabase) : [];

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="Company directory"
        title="People"
        description="Internal KSP identities, roles and active/suspended membership posture in one owner-only view."
        aside="Surface access is resolved from memberships and grants. Names and emails are never authorization keys."
      />
      <SurfaceStatus
        title="Access changes remain governed"
        body="This surface is the native INC directory. Privileged grant/revoke writes stay behind owner + MFA + RLS and are not widened by this view."
        tone="ok"
      />
      <section className="section">
        <div className="sectionHeader">
          <h2>Internal KSP roster</h2>
          <p>Active and suspended memberships</p>
        </div>
        <OwnerList rows={rows} empty="No internal organization memberships were returned." />
      </section>
    </IncShell>
  );
}
