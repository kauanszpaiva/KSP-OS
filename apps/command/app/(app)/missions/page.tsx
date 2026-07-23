import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate } from '../../../lib/format';
import { getMissions, type MissionView } from '../data';
import { EmptyState, PageHeader, Panel, SectionLabel, StatePill } from '../_components/ui';
import { DependencyForm, MilestoneForm, MilestoneStatusForm, MissionForm, MissionHealthForm } from '../_components/mission-workspace-forms';

function MissionCard({ mission, allMissions, delay }: { mission: MissionView; allMissions: MissionView[]; delay: number }) {
  return (
    <Reveal delay={delay}>
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-ink">{mission.name}</h3>
            <p className="mt-0.5 text-[12px] capitalize text-ink-3">
              {mission.project_type.replace(/_/g, ' ')} · {mission.memberIds.length} member{mission.memberIds.length === 1 ? '' : 's'}
            </p>
          </div>
          <StatePill state={mission.health} />
        </div>

        <MissionHealthForm id={mission.id} currentHealth={mission.health} />

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Milestones</p>
          {mission.milestones.length === 0 ? (
            <p className="text-[12.5px] text-ink-4">No milestones yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {mission.milestones.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="min-w-0 truncate text-ink-2">
                    {m.title}
                    {m.phase && <span className="ml-1.5 text-[11px] text-ink-4">· {m.phase}</span>}
                    {m.due_date && <span className="ml-1.5 tnum text-[11px] text-ink-4">· {formatDate(m.due_date)}</span>}
                  </span>
                  <MilestoneStatusForm id={m.id} currentStatus={m.status} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2">
            <MilestoneForm projectId={mission.id} />
          </div>
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Blocked by</p>
          {mission.dependencies.length === 0 ? (
            <p className="mb-2 text-[12.5px] text-ink-4">No dependencies.</p>
          ) : (
            <ul className="mb-2 space-y-1 text-[13px] text-ink-2">
              {mission.dependencies.map((d) => (
                <li key={d.id}>
                  {allMissions.find((m) => m.id === d.depends_on_project_id)?.name ?? 'Unknown mission'}
                  {d.note ? ` — ${d.note}` : ''}
                </li>
              ))}
            </ul>
          )}
          <DependencyForm projectId={mission.id} missions={allMissions.map((m) => ({ id: m.id, name: m.name }))} />
        </div>
      </Panel>
    </Reveal>
  );
}

export default async function MissionsPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const missions = supabase ? await getMissions(supabase) : [];

  const active = missions.filter((m) => m.status === 'active');
  const archived = missions.filter((m) => m.status !== 'active');

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Missions"
        description="The engagements, products, and campaigns commitments ladder up to. Track milestones and what's blocking what."
      />

      <details className="mb-6 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + New mission
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4">
          <MissionForm />
        </div>
      </details>

      {missions.length === 0 ? (
        <EmptyState icon="missions" title="No missions yet." hint="Create one to group commitments and milestones under a shared objective." />
      ) : (
        <div className="space-y-8">
          <div>
            <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{active.length}</span>}>Active</SectionLabel>
            <div className="grid gap-4 lg:grid-cols-2">
              {active.map((m, i) => (
                <MissionCard key={m.id} mission={m} allMissions={missions} delay={i * 50} />
              ))}
            </div>
          </div>

          {archived.length > 0 && (
            <div>
              <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{archived.length}</span>}>Archived</SectionLabel>
              <Panel className="divide-y divide-line">
                {archived.map((m) => (
                  <div key={m.id} className="flex items-center justify-between px-4 py-3">
                    <span className="truncate text-[13.5px] font-medium text-ink">{m.name}</span>
                    <StatePill state={m.status} />
                  </div>
                ))}
              </Panel>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
