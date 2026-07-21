import { canManageOutcomes } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getMembers, getOutcomes } from '../data';
import { Card, EmptyState, PageHeader, ProgressBar, StatePill } from '../_components/ui';
import { OutcomeForm, OutcomeStateForm } from '../_components/forms';

export default async function OutcomesPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const outcomes = supabase ? await getOutcomes(supabase) : [];
  const members = supabase ? await getMembers(supabase, ctx.user.id) : [];
  const canManage = canManageOutcomes(ctx);

  const active = outcomes.filter((o) => o.state === 'active');
  const remaining = Math.max(0, 3 - active.length);

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Company outcomes"
        description="The Focus Governor. A maximum of three company outcomes may be active at once."
      />

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-ksp-navy text-white">
        <div>
          <p className="text-sm text-slate-200">Active outcomes</p>
          <p className="text-3xl font-semibold">
            {active.length}
            <span className="text-lg text-slate-300"> / 3</span>
          </p>
        </div>
        <p className="max-w-xs text-sm text-slate-200">
          {remaining > 0
            ? `${remaining} slot${remaining === 1 ? '' : 's'} available. Choose what matters most.`
            : 'All slots full. Complete, pause, or replace one to activate a new outcome.'}
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          {outcomes.length === 0 ? (
            <EmptyState title="No company outcomes yet." hint={canManage ? 'Activate your first outcome to anchor the company.' : 'An executive will set company outcomes.'} />
          ) : (
            outcomes.map((o) => (
              <Card key={o.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{o.title}</h3>
                      <StatePill state={o.state} />
                    </div>
                    {o.description && <p className="mt-1 text-sm text-slate-500">{o.description}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      {o.metric ? `${o.metric}${o.target ? ` → ${o.target}` : ''}` : 'No metric set'}
                      {o.horizon_days ? ` · ${o.horizon_days}-day horizon` : ''}
                    </p>
                  </div>
                  {canManage && o.state === 'active' && (
                    <div className="flex shrink-0 gap-1">
                      <OutcomeStateForm id={o.id} target="paused">Pause</OutcomeStateForm>
                      <OutcomeStateForm id={o.id} target="completed">Complete</OutcomeStateForm>
                    </div>
                  )}
                  {canManage && o.state !== 'active' && (
                    <div className="shrink-0">
                      <OutcomeStateForm id={o.id} target="active">Reactivate</OutcomeStateForm>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Progress</span>
                    <span>{o.progress}%</span>
                  </div>
                  <ProgressBar value={o.progress} />
                </div>
              </Card>
            ))
          )}
        </div>

        {canManage ? (
          <Card>
            <h2 className="text-sm font-semibold text-ksp-navy">Activate a new outcome</h2>
            <p className="mb-4 mt-1 text-xs text-slate-500">The system blocks a fourth active outcome.</p>
            <OutcomeForm members={members} />
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-slate-500">Company outcomes are set by the founder and executive operations.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
