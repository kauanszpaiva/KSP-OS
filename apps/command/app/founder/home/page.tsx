import Link from 'next/link';
import { Icon } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate, isOverdue } from '../../../lib/format';
import { getAiInboxItems, getFounderHome } from '../data';
import { getHandoffs, getTruthItems } from '../brain/data';

export const dynamic = 'force-dynamic';

type QuietIcon = 'inbox' | 'workspace' | 'vault' | 'decisions' | 'commitments' | 'software' | 'knowledge';

function QuietRow({ href, icon, title, meta }: { href: string; icon: QuietIcon; title: string; meta?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 border-t border-line py-3 first:border-t-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-3 transition-colors group-hover:text-brand"><Icon name={icon} className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink-2 group-hover:text-ink">{title}</span>
      {meta ? <span className="shrink-0 text-[11.5px] text-ink-4">{meta}</span> : null}
      <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-ink-4" />
    </Link>
  );
}

export default async function FounderHomePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const [home, aiInbox, truth, handoffs] = supabase
    ? await Promise.all([getFounderHome(supabase, ctx.user.id), getAiInboxItems(supabase), getTruthItems(supabase, 50), getHandoffs(supabase, 50)])
    : [{ inbox: [], tasks: [], companyWork: [], vault: [] }, [], [], []];

  const inbox = home.inbox.filter((item) => item.triage_status === 'captured' || item.triage_status === 'triaged');
  const activeTasks = home.tasks.filter((task) => task.status !== 'done' && task.status !== 'archived');
  const waiting = activeTasks.filter((task) => task.status === 'waiting');
  const overduePrivate = activeTasks.filter((task) => task.status !== 'waiting' && isOverdue(task.due_date));
  const overdueCompany = home.companyWork.filter((item) => isOverdue(item.due_date));
  const aiOpen = aiInbox.filter((item) => !['done', 'cancelled'].includes(String(item.metadata?.status ?? 'queued')));
  const truthReview = truth.filter((item) => item.status !== 'verified');
  const handoffOpen = handoffs.filter((item) => !['done', 'cancelled'].includes(item.status));
  const attentionCount = inbox.length + waiting.length + overduePrivate.length + overdueCompany.length + aiOpen.length + truthReview.length + handoffOpen.length;
  const firstName = ctx.user.displayName.split(' ')[0] || 'Kauan';

  const recentCapture = inbox[0];
  const nextPrivateTask = activeTasks.find((task) => task.status !== 'waiting');
  const nextCompanyTask = home.companyWork[0];
  const readyHandoff = handoffs.find((handoff) => handoff.status === 'ready');

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 pt-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">Private · Second Brain</p>
        <h1 className="mt-2 text-[31px] font-semibold tracking-tight text-ink sm:text-[38px]">Good morning, {firstName}.</h1>
        <p className="mt-1.5 text-[13.5px] text-ink-3">Capture thoughts. Connect context. Keep the truth clear.</p>
      </header>

      <Link href="/founder/inbox" className="group block rounded-2xl border border-line bg-surface px-5 py-5 transition-colors hover:border-brand sm:px-6 sm:py-6">
        <div className="min-h-[128px] sm:min-h-[150px]">
          <p className="text-[20px] font-medium tracking-tight text-ink-3 transition-colors group-hover:text-ink">What’s on your mind?</p>
          <p className="mt-2 text-[12.5px] text-ink-4">Capture an idea, fact, link, reminder or unfinished thought. Structure it later.</p>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-4">
          <span className="flex items-center gap-2 text-[11.5px] text-ink-4"><Icon name="inbox" className="h-4 w-4" />Private by default</span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-[12px] font-semibold text-canvas transition-colors group-hover:bg-brand">Capture<Icon name="chevron-right" className="h-3.5 w-3.5" /></span>
        </div>
      </Link>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section>
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[13px] font-semibold text-ink">Continue</h2><Link href="/founder/knowledge" className="text-[11.5px] text-ink-4 hover:text-brand">Knowledge →</Link></div>
          <div className="rounded-2xl border border-line bg-surface px-4 sm:px-5">
            {readyHandoff && <QuietRow href="/founder/handoffs" icon="software" title={readyHandoff.title} meta={`→ ${readyHandoff.to_agent}`} />}
            {recentCapture && <QuietRow href="/founder/inbox" icon="inbox" title={recentCapture.title} meta="Inbox" />}
            {nextPrivateTask && <QuietRow href="/founder/work" icon="workspace" title={nextPrivateTask.title} meta={nextPrivateTask.due_date ? formatDate(nextPrivateTask.due_date) : 'Private'} />}
            {nextCompanyTask && <QuietRow href="/founder/work" icon="commitments" title={nextCompanyTask.title} meta={nextCompanyTask.due_date ? formatDate(nextCompanyTask.due_date) : 'KSP'} />}
            {!readyHandoff && !recentCapture && !nextPrivateTask && !nextCompanyTask && <div className="py-10 text-center"><p className="text-[13px] font-medium text-ink-2">A clean slate.</p><p className="mt-1 text-[12px] text-ink-4">Capture something above. The structure can come later.</p></div>}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[13px] font-semibold text-ink">Needs your attention</h2><span className="tnum text-[11.5px] text-ink-4">{attentionCount}</span></div>
          <div className="rounded-2xl border border-line bg-surface px-4 sm:px-5">
            <QuietRow href="/founder/ai-inbox" icon="software" title={`${aiOpen.length} AI ${aiOpen.length === 1 ? 'request' : 'requests'} open`} />
            <QuietRow href="/founder/truth" icon="decisions" title={`${truthReview.length} Truth ${truthReview.length === 1 ? 'item' : 'items'} to review`} />
            <QuietRow href="/founder/handoffs" icon="software" title={`${handoffOpen.length} ${handoffOpen.length === 1 ? 'handoff' : 'handoffs'} open`} />
            <QuietRow href="/founder/inbox" icon="inbox" title={`${inbox.length} ${inbox.length === 1 ? 'capture' : 'captures'} to organize`} />
            <QuietRow href="/founder/work" icon="workspace" title={`${overduePrivate.length + overdueCompany.length} overdue · ${waiting.length} waiting`} />
          </div>
        </section>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <Link href="/founder/knowledge" className="rounded-xl border border-line bg-surface px-4 py-3 text-[12.5px] font-medium text-ink-2 hover:border-brand hover:text-brand">Knowledge</Link>
        <Link href="/founder/context" className="rounded-xl border border-line bg-surface px-4 py-3 text-[12.5px] font-medium text-ink-2 hover:border-brand hover:text-brand">Context Packs</Link>
        <Link href="/founder/ai-access" className="rounded-xl border border-line bg-surface px-4 py-3 text-[12.5px] font-medium text-ink-2 hover:border-brand hover:text-brand">AI Access / MCP</Link>
      </div>
    </div>
  );
}
