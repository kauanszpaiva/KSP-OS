import { Icon, type IconName } from '../components/icons';
import { IncShell, ownerRoleLabel } from '../components/inc-shell';
import { MetricGrid, SurfaceStatus } from '../components/owner-surface';
import {
  DataUnavailable,
  DistributionBars,
  DonutChart,
  Meter,
  Panel,
  Sparkline,
  StatCard,
  StatGrid,
  VisualGrid
} from '../components/visual-data';
import type { ListRow, MetricState } from '../lib/inc-data';
import { getAuditRows, getFinanceRows, getOwnerMetrics, getWorkRows } from '../lib/inc-data';
import { requireIncOwner } from '../lib/inc-session';
import { getServerSupabase } from '../lib/supabase';
import {
  bucketByDay,
  distribution,
  formatMinorUnits,
  groupRows,
  isPastDue,
  riseDelay,
  singleCurrencyTotal
} from '../lib/visual-data';
import { getAuditRows, getOwnerMetrics, getWorkRows } from '../lib/inc-data';
import { requireIncOwner } from '../lib/inc-session';
import { getServerSupabase } from '../lib/supabase';
import { bucketByDay, distribution, isPastDue, riseDelay } from '../lib/visual-data';

/**
 * `[title, href, icon, description]`. The title/href pairs are asserted by the
 * INC owner-surface tests, so that shape stays stable while icons are added.
 */
const ownerControls = [
  ['Work', '/work', 'layers', 'See company execution across verticals without switching into Command.'],
  ['AI Company', '/ai-company', 'ai', 'Turn one sentence into a governed execution tree with evidence.'],
  ['WhatsApp', '/ai-company/communications', 'message', 'Governed AI front desk for the KSP WhatsApp number.'],
  ['Structure', '/structure', 'sitemap', 'Create operating divisions and classify projects into their vertical boundary.'],
  ['People', '/people', 'users', 'Internal KSP identities, roles and suspend/reactivate access state.'],
  ['Access', '/access', 'key', 'Business-unit membership, permanent permissions and temporary project access.'],
  ['Clients', '/clients', 'briefcase', 'Company-side client governance while Portal remains client-scoped.'],
  ['Network', '/network', 'globe', 'Subcontractors, studios and owner-operated partner membership.'],
  ['Finance', '/finance', 'banknote', 'Invoices, approvals and recurring operating costs.'],
  ['Audit', '/audit', 'history', 'Recent audit evidence for privileged and operational actions.'],
  ['Platform', '/platform', 'server', 'Authorization substrate and source/live promotion posture.']
] as const;

type PostureItem = { label: string; value: string; tone: 'ok' | 'warning' | 'neutral'; icon: IconName };

export default async function IncHomePage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();

  const [metrics, workRows, auditRows, financeRows] = await Promise.all([
    supabase ? getOwnerMetrics(supabase) : Promise.resolve([] as MetricState[]),
    supabase ? getWorkRows(supabase) : Promise.resolve([] as ListRow[]),
    supabase ? getAuditRows(supabase) : Promise.resolve([] as ListRow[]),
    supabase ? getFinanceRows(supabase) : Promise.resolve([] as ListRow[])
  const [metrics, workRows, auditRows] = await Promise.all([
    supabase ? getOwnerMetrics(supabase) : Promise.resolve([] as MetricState[]),
    supabase ? getWorkRows(supabase) : Promise.resolve([] as ListRow[]),
    supabase ? getAuditRows(supabase) : Promise.resolve([] as ListRow[])
  ]);

  const now = new Date();
  const taskMix = distribution(workRows.map((row) => row.status), { limit: 5, otherLabel: 'Other statuses' });
  const auditByAction = distribution(auditRows.map((row) => row.primary), { limit: 5, otherLabel: 'Other actions' });
  const activity = bucketByDay(auditRows.map((row) => row.at), 14, now);
  const datedTasks = workRows.filter((row) => Boolean(row.at));
  const pastDue = datedTasks.filter((row) => isPastDue(row.at, row.status, now)).length;
  const distinctActions = new Set(auditRows.map((row) => row.primary)).size;

  const invoices = groupRows(financeRows, 'invoice');
  const approvals = groupRows(financeRows, 'approval');
  const invoiceMix = distribution(invoices.map((row) => row.status), {
    limit: 6,
    otherLabel: 'Other statuses'
  });
  const approvalRiskMix = distribution(
    approvals.map((row) => (row.meta?.startsWith('Risk ') ? row.meta.slice('Risk '.length) : undefined))
  );
  const invoiceTotal = singleCurrencyTotal(invoices);
  const pendingApprovals = approvals.filter((row) => /pending|open|review|await/i.test(row.status ?? '')).length;
  const invoiceValueText =
    invoiceTotal.count === 0
      ? '—'
      : invoiceTotal.mixed
        ? `${invoiceTotal.count} rows`
        : formatMinorUnits(invoiceTotal.total, invoiceTotal.currency);
  const invoiceValueNote =
    invoiceTotal.count === 0
      ? 'No returned invoice carried an amount.'
      : invoiceTotal.mixed
        ? 'More than one currency is present, so no single total is shown.'
        : `Sum of the ${invoiceTotal.count} returned invoices that carry an amount.`;

  const posture: PostureItem[] = [
    { label: 'Authorization', value: 'Server + RLS authoritative', tone: 'ok', icon: 'shield' },
    {
      label: 'MFA session',
      value: ctx.mfa ? 'AAL2 verified' : 'Step-up required for writes',
      tone: ctx.mfa ? 'ok' : 'warning',
      icon: ctx.mfa ? 'lock' : 'alert'
    },
    { label: 'Founder OS', value: 'Separate private boundary', tone: 'neutral', icon: 'server' },
    { label: 'Production lineage', value: 'Preflight required before DDL', tone: 'warning', icon: 'database' }
  ];

  return (
    <IncShell mfa={ctx.mfa} ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <section className="ownerHero">
        <div>
          <div className="eyebrow">
            <Icon className="eyebrowIcon" name="pulse" size={13} />
            Global owner layer
          </div>
          <h1>
            One company.
            <br />
            One owner workspace.
          </h1>
          <p>
            KSP INC is the operating surface for global owners. Command, Portal and Network remain separate persona experiences, while INC uses the same canonical identity, data, permissions and audit substrate.
          </p>
        </div>
        <aside className="heroAside">
          <strong>Owner boundary</strong>
          <span>
            Access is role-based, server-guarded and RLS-backed. Founder OS remains a separate founder-only boundary; global ownership never means anonymous bypass or impersonation.
          </span>
        </aside>
      </section>

      <SurfaceStatus
        title="Native INC owner operations are active in source"
        body="Structure, internal membership state, vertical scope, permanent permissions, temporary project access and Network membership are now operated inside apps/inc. Every privileged mutation requires KSP INC owner role + AAL2/MFA and remains subject to database RLS."
        tone="ok"
      />

      <section className="section" aria-labelledby="company-heading">
        <div className="sectionHeader">
          <h2 id="company-heading">Company snapshot</h2>
          <p>Canonical counts for this environment · each row is a real table read</p>
        </div>
        {metrics.length > 0 ? (
          <MetricGrid metrics={metrics} />
        ) : (
          <DataUnavailable
            label="Company metrics unavailable"
            reason="The owner data plane did not answer in this environment. Counts are withheld rather than shown as zero."
          />
        )}
      </section>

      <section className="section" aria-labelledby="signals-heading">
        <div className="sectionHeader">
          <h2 id="signals-heading">Operating signals</h2>
          <p>Derived only from the rows returned to this owner session</p>
        </div>
        <StatGrid label="Owner attention signals">
          <StatCard
            icon="clock"
            index={0}
            label="Tasks past due date"
            note={`Within the ${workRows.length} most recent owner-visible tasks`}
            tone={pastDue > 0 ? 'risk' : 'ok'}
            value={pastDue}
          />
          <StatCard
            icon="layers"
            index={1}
            label="Tasks in returned window"
            note="Newest first · owner scope"
            value={workRows.length}
          />
          <StatCard
            icon="history"
            index={2}
            label="Audit events in window"
            note="Most recent 80 privileged and operational events"
            value={auditRows.length}
          />
          <StatCard
            icon="pulse"
            index={3}
            label="Distinct audit actions"
            note="Unique action keys in the returned window"
            value={distinctActions}
          />
          <StatCard
            icon="banknote"
            index={4}
            label="Invoice value returned"
            note={invoiceValueNote}
            valueText={invoiceValueText}
          />
          <StatCard
            icon="shield"
            index={5}
            label="Approvals awaiting decision"
            note="Returned approvals whose status reads as pending, open or review"
            tone={pendingApprovals > 0 ? 'warning' : 'ok'}
            value={pendingApprovals}
          />
        </StatGrid>

        <div className="visualGrid visualGridSpaced">
          <Panel index={0} note="Task status · newest 40 owner-visible rows" title="Work mix">
            <DonutChart
              caption="Share of returned tasks by status"
              centerLabel="tasks returned"
              centerValue={String(workRows.length)}
              emptyLabel="No owner-visible tasks were returned in this environment."
              items={taskMix}
            />
          </Panel>

          <Panel index={1} note="Events per UTC day · most recent 80 events" title="Audit activity">
            <Sparkline buckets={activity} caption="Audit events per day" />
          </Panel>

          <Panel index={2} note="Most frequent action keys in the returned window" title="Audit by action">
            <DistributionBars
              emptyLabel="No audit events were returned in this environment."
              items={auditByAction}
              tone="scale"
            />
          </Panel>

          <Panel index={3} note="Rule: due date before today and status not closed" title="Delivery attention">
            {datedTasks.length === 0 ? (
              <p className="visualEmpty">No returned task carries a due date, so no delivery trend can be shown.</p>
            ) : (
              <Meter
                detail={`${pastDue} of ${datedTasks.length} dated tasks in the returned window are past their due date.`}
                label="Past due"
                max={datedTasks.length}
                tone={pastDue > 0 ? 'risk' : 'ok'}
                value={pastDue}
              />
            )}
          </Panel>

          <Panel index={4} note="Status of the most recent 30 invoices returned to this owner session" title="Invoice status">
            <DonutChart
              caption="Share of returned invoices by status"
              centerLabel="invoices"
              centerValue={String(invoices.length)}
              emptyLabel="No invoice was returned in this environment."
              items={invoiceMix}
            />
          </Panel>

          <Panel index={5} note="risk_level recorded on the returned approval requests" title="Approval risk">
            <DistributionBars
              emptyLabel="No approval request was returned in this environment."
              items={approvalRiskMix}
            />
          </Panel>
        </div>
      </section>

      <section className="section" aria-labelledby="controls-heading">
        <div className="sectionHeader">
          <h2 id="controls-heading">Owner workspace</h2>
          <p>INC-native navigation</p>
        </div>
        <div className="controlGrid">
          {ownerControls.map(([title, href, icon, description], index) => (
            <a className="control rise" href={href} key={title} style={riseDelay(index, 30)}>
              <span className="controlIcon">
                <Icon name={icon} size={17} />
              </span>
              <strong>{title}</strong>
              <span className="controlBody">{description}</span>
              <span className="controlGo">
                Open
                <Icon name="arrow-right" size={13} />
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="posture-heading">
        <div className="sectionHeader">
          <h2 id="posture-heading">Security posture</h2>
          <p>Owner access remains governed</p>
        </div>
        <div className="posture">
          {posture.map((item) => (
            <div className="postureItem" key={item.label}>
              <span className={`postureIcon tone${item.tone === 'ok' ? 'Ok' : item.tone === 'warning' ? 'Warning' : 'Neutral'}`}>
                <Icon name={item.icon} size={16} />
              </span>
              <small>{item.label}</small>
              <strong className={item.tone === 'ok' ? 'ok' : item.tone === 'warning' ? 'attention' : undefined}>
                {item.value}
              </strong>
            </div>
          ))}
        </div>
      </section>
    </IncShell>
  );
}

