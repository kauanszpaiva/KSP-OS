import { canManageOutcomes } from '@ksp/auth';
import type { CompanyOutcome } from '@ksp/database';
import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getMembers, getOutcomes } from '../data';
import { EmptyState, PageHeader, Panel, Ring, SectionLabel, SlotMeter, StatePill } from '../_components/ui';
import { OutcomeForm, OutcomeStateForm } from '../_components/forms';

function Lane({ outcome, canManage, delay }: { outcome: CompanyOutcome | null; canManage: boolean; delay: number }) {
  if (!outcome) {
    return (
      <Reveal
        delay={delay}
        className="flex min-h-[188px] flex-col items-center justify-center rounded-xl border border-dashed border-line-2 bg-surface/40 p-5 text-center transition-colors duration-fast hover:bg-surface/70"
      >
        <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-line-2 text-ink-4">+</span>
        <p className="text-[13px] font-medium text-ink-3">Open slot</p>
        <p className="mt-0.5 text-[12px] text-ink-4">Capacity for one more company outcome.</p>
      </Reveal>
    );
  }
  return (
    <Reveal
      delay={delay}
      className="flex min-h-[188px] flex-col rounded-xl border border-line bg-surface p-5 shadow-card transition-[border-color,box-shadow] duration-fast hover:border-line-2 hover:shadow-pop"
    >
      <div className="flex items-start gap-4">
        <Ring value={outcome.progress} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug text-ink">{outcome.title}</h3>
          <p className="mt-1 text-[12px] text-ink-3">
            {outcome.metric ? `${outcome.metric}${outcome.target ? ` → ${outcome.target}` : ''}` : 'No metric set'}
          </p>
          {outcome.horizon_days && <p className="mt-0.5 text-[12px] text-ink-4">{outcome.horizon_days}-day horizon</p>}
        </div>
      </div>
      {outcome.description && <p className="mt-3 line-clamp-2 text-[13px] text-ink-2">{outcome.description}</p>}
      {canManage && (
        <div className="mt-auto flex gap-1 border-t border-line pt-3">
          <OutcomeStateForm id={outcome.id} target="paused">Pause</OutcomeStateForm>
          <OutcomeStateForm id={outcome.id} target="completed">Complete</OutcomeStateForm>
        </div>
      )}
    </Reveal>
  );
}

export default async function OutcomesPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const outcomes = supabase ? await getOutcomes(supabase) : [];
  const members = supabase ? await getMembers(supabase, ctx.user.id) : [];
  const canManage = canManageOutcomes(ctx);

  const active = outcomes.filter((o) => o.state === 'active').slice(0, 3);
  const inactive = outcomes.filter((o) => o.state !== 'active');
  const slots: Array<CompanyOutcome | null> = [active[0] ?? null, active[1] ?? null, active[2] ?? null];

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Company outcomes"
        description="The Focus Governor. At most three outcomes are active at once — the constraint is the point."
        action={
          <div className="text-right">
            <p className="tnum text-2xl font-semibold text-ink">
              {active.length}
              <span className="text-base font-normal text-ink-3"> / 3</span>
            </p>
            <div className="mt-1.5">
              <SlotMeter filled={active.length} total={3} />
            </div>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {slots.map((o, i) => (
          <Lane key={o?.id ?? `slot-${i}`} outcome={o} canManage={canManage} delay={i * 60} />
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionLabel>Paused &amp; closed</SectionLabel>
          {inactive.length === 0 ? (
            <EmptyState title="No paused or completed outcomes yet." />
          ) : (
            <Panel className="divide-y divide-line">
              {inactive.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">{o.title}</p>
                    <div className="mt-0.5"><StatePill state={o.state} /></div>
                  </div>
                  {canManage && active.length < 3 && (
                    <OutcomeStateForm id={o.id} target="active">Reactivate</OutcomeStateForm>
                  )}
                </div>
              ))}
            </Panel>
          )}
        </div>

        <div>
          <SectionLabel>{canManage ? 'Activate an outcome' : 'Governance'}</SectionLabel>
          <Panel className="p-5">
            {canManage ? (
              active.length >= 3 ? (
                <p className="text-[13px] text-ink-2">
                  All three slots are full. Pause, complete, or replace an active outcome before activating another —
                  the system enforces this.
                </p>
              ) : (
                <OutcomeForm members={members} />
              )
            ) : (
              <p className="text-[13px] text-ink-2">Company outcomes are set by the founder and executive operations.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
