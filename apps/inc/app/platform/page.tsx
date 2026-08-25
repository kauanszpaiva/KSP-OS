import { IncShell, ownerRoleLabel } from "../../components/inc-shell";
import { MetricGrid, OwnerPageHeader, SurfaceStatus } from "../../components/owner-surface";
import { getPlatformMetrics } from "../../lib/inc-data";
import { requireIncOwner } from "../../lib/inc-session";
import { getServerSupabase } from "../../lib/supabase";

export default async function IncPlatformPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const metrics = supabase ? await getPlatformMetrics(supabase) : [];

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        eyebrow="Platform posture"
        title="Platform"
        description="Owner-facing health snapshot for the authorization and operating substrate behind KSP OS."
        aside="A dash means the table is not available through this environment. That is surfaced explicitly instead of being mistaken for zero."
      />
      <SurfaceStatus
        title="Source/live parity remains a release gate"
        body="The connected appkspos database is behind repository source for business-unit and Network tables. Production promotion remains blocked until migration lineage is reconciled."
        tone="attention"
      />
      <section className="section">
        <div className="sectionHeader">
          <h2>Authorization substrate</h2>
          <p>Current environment</p>
        </div>
        <MetricGrid metrics={metrics} />
      </section>
    </IncShell>
  );
}
