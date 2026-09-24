import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { OwnerPageHeader, SurfaceStatus } from '../../components/owner-surface';
import { Icon, type IconName } from '../../components/icons';
import { StreamList } from '../../components/stream-list';
import { TabGroup } from '../../components/tabs';
import {
  ActivityStrip,
  DistributionBars,
  DonutChart,
  Meter,
  Panel,
  Sparkline,
  StatCard,
  StatGrid,
  VisualGrid
} from '../../components/visual-data';
import type { ListRow } from '../../lib/inc-data';
import { bucketByDay, distribution, riseDelay } from '../../lib/visual-data';

const fixtureRows: ListRow[] = [
  { id: '1', primary: 'Launch client onboarding intelligence', secondary: 'in progress', meta: 'Due 2026-09-30', group: 'task', status: 'in_progress' },
  { id: '2', primary: 'Invoice · issued', secondary: 'BRL', meta: 'Amount BRL 12,500.00', group: 'invoice', status: 'issued' },
  { id: '3', primary: 'Approval · purchase', secondary: 'pending', meta: 'Risk high', group: 'approval', status: 'pending' },
  { id: '4', primary: 'Temporary · tasks.share', secondary: 'Profile 8f2', meta: 'Until 2026-10-01', group: 'temporary', status: 'time-bound' },
  { id: '5', primary: 'access.grant', secondary: 'profiles · 91a', meta: '2026-09-24T09:12:00Z', group: 'audit', status: 'internal' }
];

const fixtureBuckets = bucketByDay(
  ['2026-09-24T09:00:00Z', '2026-09-24T11:00:00Z', '2026-09-22T08:00:00Z', '2026-09-18T08:00:00Z'],
  14,
  new Date('2026-09-24T18:00:00Z')
);

export default function VisualCheckPage() {
  return (
    <IncShell mfa ownerName="Visual check" roleLabel={ownerRoleLabel(['founder_ceo'])}>
      <OwnerPageHeader
        aside="Temporary local design-check route. It is deleted before commit and is not a product surface."
        description="Fixture data used only to review the operating shell, dashboard primitives and animation states."
        eyebrow="Visual check"
        icon="spark"
        title="Dashboard review"
      />
      <SurfaceStatus title="Fixture data" body="Not a product surface." tone="attention" />

      <section className="section">
        <div className="sectionHeader">
          <h2>KPI cards</h2>
          <p>Count-up + tone</p>
        </div>
        <StatGrid label="Fixture metrics">
          <StatCard icon="layers" index={0} label="Tasks in window" note="Fixture" value={128} />
          <StatCard icon="clock" index={1} label="Past due" note="Fixture" tone="risk" value={7} />
          <StatCard icon="banknote" index={2} label="Invoice value" note="Fixture" valueText="BRL 12,500.00" />
          <StatCard icon="server" index={3} label="Table unavailable" note="Fixture · not promoted" tone="warning" value={null} />
        </StatGrid>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <h2>Visual data</h2>
          <p>Donut · sparkline · bars · strip · meter</p>
        </div>
        <VisualGrid>
          <Panel index={0} note="Fixture" title="Work mix">
            <DonutChart
              caption="Fixture"
              centerLabel="tasks"
              centerValue="40"
              emptyLabel="none"
              items={distribution(['in progress', 'in progress', 'done', 'blocked'], { limit: 4 })}
            />
          </Panel>
          <Panel index={1} note="Fixture" title="Audit activity">
            <Sparkline buckets={fixtureBuckets} caption="Audit events per day" />
          </Panel>
          <Panel index={2} note="Fixture" title="Audit by action">
            <DistributionBars emptyLabel="none" items={distribution(['access.grant', 'access.grant', 'task.create'])} tone="scale" />
          </Panel>
          <Panel index={3} note="Fixture" title="Daily volume">
            <ActivityStrip buckets={fixtureBuckets} caption="Audit events per day" />
          </Panel>
          <Panel index={4} note="Fixture" title="Coverage">
            <Meter detail="Fixture meter" label="Classified" max={14} tone="warning" value={9} />
          </Panel>
        </VisualGrid>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <h2>Streams</h2>
          <p>Tabs · filters · search · disclosure</p>
        </div>
        <TabGroup
          label="Fixture streams"
          tabs={[
            { id: 'a', label: 'Tasks', icon: 'layers', note: '5' },
            { id: 'b', label: 'Money', icon: 'banknote', note: '2' }
          ]}
          panels={[
            <StreamList
              empty="none"
              facets={[{ id: 'audit', label: 'Audit', groups: ['audit'], icon: 'history' }]}
              key="a"
              rows={fixtureRows}
            />,
            <StreamList empty="none" key="b" rows={fixtureRows} />
          ]}
        />
      </section>

      <section className="section">
        <div className="sectionHeader">
          <h2>Control and posture</h2>
          <p>Fixture</p>
        </div>
        <div className="controlGrid">
          {([
            ['Work', '/work', 'layers', 'Fixture control card.'],
            ['Finance', '/finance', 'banknote', 'Fixture control card.']
          ] as Array<[string, string, IconName, string]>).map(([title, href, icon, body], index) => (
            <a className="control rise" href={href} key={title} style={riseDelay(index, 30)}>
              <span className="controlIcon">
                <Icon name={icon} size={17} />
              </span>
              <strong>{title}</strong>
              <span className="controlBody">{body}</span>
              <span className="controlGo">
                Open
                <Icon name="arrow-right" size={13} />
              </span>
            </a>
          ))}
        </div>
      </section>
    </IncShell>
  );
}
