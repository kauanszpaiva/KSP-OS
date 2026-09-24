import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { MetricGrid, OwnerPageHeader, SurfaceStatus } from '../../components/owner-surface';
import { DataUnavailable, DistributionBars, Meter, Panel, VisualGrid } from '../../components/visual-data';
import { getPlatformMetrics } from '../../lib/inc-data';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';
import { ratioOf } from '../../lib/visual-data';

export default async function IncPlatformPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const metrics = supabase ? await getPlatformMetrics(supabase) : [];

  const answered = metrics.filter((metric) => metric.value != null);
  const missing = metrics.filter((metric) => metric.value == null);
  const totalRows = answered.reduce((acc, metric) => acc + (metric.value ?? 0), 0);
  const surface = answered
    .map((metric) => ({
      label: metric.label.replace(/_/g, ' '),
      value: metric.value ?? 0,
      ratio: ratioOf(metric.value ?? 0, totalRows)
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <IncShell mfa={ctx.mfa} ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        aside="A dash means the table is not available through this environment. That is surfaced explicitly instead of being mistaken for zero."
        description="Owner-facing health snapshot for the authorization and operating substrate behind KSP OS."
        eyebrow="Platform posture"
        icon="server"
        title="Platform"
      />
      <SurfaceStatus
        title="Source/live parity remains a release gate"
        body="The connected appkspos database is behind repository source for business-unit and Network tables. Production promotion remains blocked until migration lineage is reconciled."
        tone="attention"
      />

      <section className="section" aria-labelledby="platform-summary">
        <div className="sectionHeader">
          <h2 id="platform-summary">Authorization substrate</h2>
          <p>Current environment · each card is a real table read</p>
        </div>
        <MetricGrid metrics={metrics} />
      </section>

      <section className="section" aria-labelledby="platform-visuals">
        <div className="sectionHeader">
          <h2 id="platform-visuals">Substrate shape</h2>
          <p>Only tables that answered in this environment are charted</p>
        </div>
        <VisualGrid>
          <Panel index={0} note="Tables that answered, ranked by row count" title="Access surface by table">
            {surface.length > 0 ? (
              <DistributionBars emptyLabel="No substrate table answered in this environment." items={surface} tone="scale" />
            ) : (
              <DataUnavailable
                label="No substrate table answered"
                reason="Every owner-plane count returned an error in this environment, so nothing can be charted yet."
              />
            )}
          </Panel>
          <Panel index={1} note="Share of configured reads that returned a count" title="Read coverage">
            <Meter
              detail={`${answered.length} of ${metrics.length} owner-plane reads answered in this environment.`}
              label="Tables answering"
              max={metrics.length}
              tone={missing.length === 0 ? 'ok' : 'warning'}
              value={answered.length}
            />
            {missing.length > 0 ? (
              <div className="panelStack">
                {missing.map((metric) => (
                  <DataUnavailable
                    key={metric.label}
                    label={metric.label.replace(/_/g, ' ')}
                    reason={metric.note}
                  />
                ))}
              </div>
            ) : (
              <p className="meterDetail">Every configured owner-plane read answered.</p>
            )}
          </Panel>
        </VisualGrid>
      </section>
    </IncShell>
  );
}

