import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { PageHeader } from '../../(app)/_components/ui';
import { HandoffForm, HandoffUpdateForm } from '../brain/_components/forms';
import { getContextPacks, getHandoffs } from '../brain/data';

export const dynamic = 'force-dynamic';

export default async function FounderHandoffsPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const [handoffs, packs] = supabase ? await Promise.all([getHandoffs(supabase), getContextPacks(supabase)]) : [[], []];
  const packById = new Map(packs.map((pack) => [pack.id, pack]));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Private · AI Coordination"
        title="Handoffs"
        description="Pass a bounded job from you or one AI to another with a clear objective, optional context pack, status and returned output."
      />
      <HandoffForm packs={packs} />

      <div className="mt-7 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-ink">Handoff queue</h2>
        <span className="text-[11.5px] text-ink-4">{handoffs.filter((handoff) => !['done', 'cancelled'].includes(handoff.status)).length} open</span>
      </div>
      <div className="mt-2 space-y-3">
        {handoffs.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface py-10 text-center text-[13px] text-ink-4">No handoffs yet.</div>
        ) : handoffs.map((handoff) => {
          const pack = handoff.context_pack_id ? packById.get(handoff.context_pack_id) : null;
          return (
            <article key={handoff.id} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-ink-4">
                <span className={handoff.status === 'blocked' ? 'font-semibold text-risk' : handoff.status === 'done' ? 'font-semibold text-success' : ''}>{handoff.status}</span>
                <span>·</span><span>{handoff.from_agent} → {handoff.to_agent}</span>
                {handoff.claimed_by && <><span>·</span><span>claimed by {handoff.claimed_by}</span></>}
              </div>
              <h3 className="mt-1 text-[14px] font-semibold text-ink">{handoff.title}</h3>
              <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-5 text-ink-2">{handoff.objective}</p>
              {handoff.instructions && <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-ink-3">Instructions: {handoff.instructions}</p>}
              {pack && <p className="mt-2 text-[11px] text-brand">Context: {pack.title}</p>}
              {handoff.output && <div className="mt-3 rounded-xl bg-surface-2 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">Output</p><p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-5 text-ink-2">{handoff.output}</p></div>}
              {!['done', 'cancelled'].includes(handoff.status) && <HandoffUpdateForm id={handoff.id} currentStatus={handoff.status} />}
            </article>
          );
        })}
      </div>
    </div>
  );
}
