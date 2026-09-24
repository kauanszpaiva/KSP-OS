import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { OwnerPageHeader } from '../../components/owner-surface';
import { StreamList } from '../../components/stream-list';
import {
  ActivityStrip,
  DistributionBars,
  Panel,
  Sparkline,
  StatCard,
  StatGrid,
  VisualGrid
} from '../../components/visual-data';
import { getAuditRows } from '../../lib/inc-data';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';
import { bucketByDay, distribution, statusFacets } from '../../lib/visual-data';

const ACTIVITY_DAYS = 14;

export default async function IncAuditPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const rows = supabase ? await getAuditRows(supabase) : [];

  const now = new Date();
  const activity = bucketByDay(rows.map((row) => row.at), ACTIVITY_DAYS, now);
  const byAction = distribution(rows.map((row) => row.primary), { limit: 6, otherLabel: 'Other actions' });
  const byTable = distribution(rows.map((row) => row.secondary), { limit: 6, otherLabel: 'Other targets' });
  const byClassification = distribution(rows.map((row) => row.status));
  const today = activity[activity.length - 1]?.value ?? 0;

  return (
    <IncShell mfa={ctx.mfa} ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        aside="Owner access does not remove accountability. INC should make privileged actions easier to inspect, not less visible."
        description="Recent privileged and operational evidence from the canonical audit stream."
        eyebrow="Control evidence"
        icon="history"
        title="Audit"
      />

      <section className="section" aria-labelledby="audit-summary">
        <div className="sectionHeader">
          <h2 id="audit-summary">Evidence window</h2>
          <p>Most recent 80 audit events returned to this owner session</p>
        </div>
        <StatGrid label="Audit evidence metrics">
          <StatCard icon="history" index={0} label="Audit events returned" note="Newest first" value={rows.length} />
          <StatCard icon="calendar" index={1} label={`Events in the last ${ACTIVITY_DAYS} days`} note="UTC day buckets" value={activity.reduce((acc, bucket) => acc + bucket.value, 0)} />
          <StatCard icon="clock" index={2} label="Events today" note="UTC" value={today} />
          <StatCard icon="target" index={3} label="Distinct target tables" note="Unique target_table values in the window" value={new Set(rows.map((row) => row.secondary)).size} />
        </StatGrid>
      </section>

      <section className="section" aria-labelledby="audit-visuals">
        <div className="sectionHeader">
          <h2 id="audit-visuals">Activity shape</h2>
          <p>Derived from the returned audit rows only</p>
        </div>
        <VisualGrid>
          <Panel index={0} note={`Events per UTC day · last ${ACTIVITY_DAYS} days`} title="Audit activity">
            <Sparkline buckets={activity} caption="Audit events per day" />
          </Panel>
          <Panel index={1} note="Distribution of the same window as volume bars" title="Daily volume">
            <ActivityStrip buckets={activity} caption="Audit events per day" />
          </Panel>
          <Panel index={2} note="Most frequent action keys" title="Audit by action">
            <DistributionBars emptyLabel="No audit events were returned." items={byAction} tone="scale" />
          </Panel>
          <Panel index={3} note="Where the events landed" title="Audit by target">
            <DistributionBars emptyLabel="No audit targets were returned." items={byTable} tone="scale" />
          </Panel>
        </VisualGrid>
      </section>

      <section className="section" aria-labelledby="audit-list">
        <div className="sectionHeader">
          <h2 id="audit-list">Recent audit events</h2>
          <p>Newest first · filter by classification or search the window</p>
        </div>
        <StreamList
          empty="No audit events were returned."
          facets={statusFacets(rows)}
          rows={rows}
          searchPlaceholder="Search action, target or classification"
        />
      </section>

      {byClassification.length > 0 ? (
        <section className="section" aria-labelledby="audit-classification">
          <div className="sectionHeader">
            <h2 id="audit-classification">Classification spread</h2>
            <p>classification field of the returned events</p>
          </div>
          <Panel index={0} note="Events per recorded classification" title="By classification">
            <DistributionBars emptyLabel="No classifications were returned." items={byClassification} />
          </Panel>
        </section>
      ) : null}
    </IncShell>
  );
}

