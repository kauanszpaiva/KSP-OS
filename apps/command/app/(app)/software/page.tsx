import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate, isOverdue } from '../../../lib/format';
import { getSoftwareTasks } from '../data';
import { EmptyState, PageHeader, Panel, SectionLabel } from '../_components/ui';
import { TaskLinkForm } from '../_components/control-forms';

export default async function SoftwarePage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const tasks = supabase ? await getSoftwareTasks(supabase) : [];

  const open = tasks.filter((t) => t.status === 'active');
  const blocked = open.filter((t) => t.blocked);
  const inFlight = open.filter((t) => !t.blocked);

  return (
    <div>
      <PageHeader
        eyebrow="Control"
        title="Software"
        description="The dev queue — every open task, with a place to drop the PR or deploy-preview link."
      />

      {tasks.length === 0 ? (
        <EmptyState icon="software" title="Nothing in the queue." hint="Tasks created in Workspace will surface here too — this is the same list, dev-focused." />
      ) : (
        <div className="space-y-8">
          {blocked.length > 0 && (
            <Reveal>
              <SectionLabel right={<span className="tnum text-[12px] text-risk">{blocked.length}</span>}>Blocked</SectionLabel>
              <Panel className="divide-y divide-line">
                {blocked.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-ink">{t.title}</p>
                      <p className="mt-0.5 text-[12px] text-ink-3">
                        {t.ownerName}
                        {t.projectName ? ` · ${t.projectName}` : ''}
                      </p>
                    </div>
                    <TaskLinkForm id={t.id} currentLink={t.link} />
                  </div>
                ))}
              </Panel>
            </Reveal>
          )}

          <Reveal delay={60}>
            <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{inFlight.length}</span>}>In flight</SectionLabel>
            {inFlight.length === 0 ? (
              <p className="rounded-lg border border-line bg-surface px-4 py-5 text-[13px] text-ink-3">Nothing open.</p>
            ) : (
              <Panel className="divide-y divide-line">
                {inFlight.map((t) => {
                  const overdue = isOverdue(t.due_date);
                  return (
                    <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-ink">{t.title}</p>
                        <p className="mt-0.5 text-[12px] text-ink-3">
                          {t.ownerName}
                          {t.projectName ? ` · ${t.projectName}` : ''}
                          {t.due_date && <span className={overdue ? 'text-risk' : ''}> · due {formatDate(t.due_date)}</span>}
                        </p>
                      </div>
                      <TaskLinkForm id={t.id} currentLink={t.link} />
                    </div>
                  );
                })}
              </Panel>
            )}
          </Reveal>
        </div>
      )}
    </div>
  );
}
