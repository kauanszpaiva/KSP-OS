import Link from 'next/link';
import { Icon, type IconName } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate, isOverdue } from '../../../lib/format';
import { PageHeader } from '../../(app)/_components/ui';
import { getAiInboxItems, getFounderHome } from '../data';
import { getContextPacks, getHandoffs, getSources, getTruthItems } from '../brain/data';
import { FounderQuickCapture } from '../_components/quick-capture';

export const dynamic = 'force-dynamic';

type RowIcon = Extract<IconName, 'inbox' | 'workspace' | 'decisions' | 'commitments' | 'software' | 'knowledge' | 'connections'>;
type StatusTone = 'neutral' | 'brand' | 'good' | 'warn' | 'risk';

const toneClass: Record<StatusTone, string> = {
  neutral: 'bg-ink-4',
  brand: 'bg-brand',
  good: 'bg-good',
  warn: 'bg-warn',
  risk: 'bg-risk'
};

function StatusCard({ label, value, detail, href, tone = 'neutral', className = '' }: { label: string; value: number; detail: string; href: string; tone?: StatusTone; className?: string }) {
  return (
    <Link href={href} className={`group min-w-0 px-4 py-3.5 transition-colors duration-fast hover:bg-surface-2 ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${toneClass[tone]}`} aria-hidden />
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">{label}</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <span className="tnum text-[25px] font-semibold leading-none text-ink">{value}</span>
        <span className="line-clamp-2 max-w-[145px] text-right text-[10.5px] leading-snug text-ink-4 group-hover:text-ink-3">{detail}</span>
      </div>
    </Link>
  );
}

function QuietRow({ href, icon, title, meta, tone }: { href: string; icon: RowIcon; title: string; meta?: string; tone?: StatusTone }) {
  return (
    <Link href={href} className="group flex min-h-12 items-center gap-3 border-t border-line py-3 first:border-t-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-3 transition-colors group-hover:text-brand"><Icon name={icon} className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-2 group-hover:text-ink">{title}</span>
      {tone ? <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneClass[tone]}`} aria-hidden /> : null}
      {meta ? <span className="shrink-0 text-[11px] text-ink-4">{meta}</span> : null}
      <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-ink-4" />
    </Link>
  );
}

function LayerRow({ href, icon, title, value, detail }: { href: string; icon: RowIcon; title: string; value: number; detail: string }) {
  return (
    <Link href={href} className="group flex items-start gap-3 border-t border-line py-3.5 first:border-t-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand"><Icon name={icon} className="h-[18px] w-[18px]" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3"><span className="text-[13px] font-semibold text-ink">{title}</span><span className="tnum text-[11px] text-ink-4">{value}</span></span>
        <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-4 group-hover:text-ink-3">{detail}</span>
      </span>
    </Link>
  );
}

export default async function FounderHomePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const [home, aiInbox, truth, sources, packs, handoffs] = supabase
    ? await Promise.all([
        getFounderHome(supabase, ctx.user.id),
        getAiInboxItems(supabase),
        getTruthItems(supabase, 100),
        getSources(supabase, 100),
        getContextPacks(supabase, 100),
        getHandoffs(supabase, 100)
      ])
    : [{ inbox: [], tasks: [], companyWork: [], vault: [] }, [], [], [], [], []];

  const inbox = home.inbox.filter((item) => item.triage_status === 'captured' || item.triage_status === 'triaged');
  const activeTasks = home.tasks.filter((task) => task.status !== 'done' && task.status !== 'archived');
  const waiting = activeTasks.filter((task) => task.status === 'waiting');
  const overduePrivate = activeTasks.filter((task) => task.status !== 'waiting' && isOverdue(task.due_date));
  const overdueCompany = home.companyWork.filter((item) => isOverdue(item.due_date));
  const aiOpen = aiInbox.filter((item) => !['done', 'cancelled'].includes(String(item.metadata?.status ?? 'queued')));
  const truthReview = truth.filter((item) => item.status !== 'verified');
  const sourceReview = sources.filter((source) => source.trust_status === 'unverified' || source.trust_status === 'conflict');
  const activePacks = packs.filter((pack) => pack.status === 'active');
  const handoffOpen = handoffs.filter((handoff) => !['done', 'cancelled'].includes(handoff.status));

  const recentCapture = inbox[0];
  const nextPrivateTask = activeTasks.find((task) => task.status !== 'waiting');
  const nextCompanyTask = home.companyWork[0];
  const readyHandoff = handoffs.find((handoff) => handoff.status === 'ready');
  const firstName = ctx.user.displayName.split(' ')[0] || 'Kauan';

  return (
    <div className="mx-auto w-full max-w-[1260px]">
      <PageHeader
        eyebrow="Founder OS · Private Second Brain"
        title={`Good morning, ${firstName}.`}
        description="Capture first. Verify what matters. Build clean context once, then let every connected AI work from the same private source of truth."
        action={<Link href="/founder/knowledge" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[12px] font-medium text-ink-2 hover:border-brand hover:text-brand"><Icon name="search" className="h-4 w-4" />Search Brain</Link>}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
        <FounderQuickCapture />
        <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-card" aria-label="Second Brain status">
          <StatusCard label="Inbox" value={inbox.length} detail="captures to organize" href="/founder/inbox" tone={inbox.length ? 'warn' : 'good'} />
          <StatusCard label="Truth" value={truthReview.length} detail="items need review" href="/founder/truth" tone={truthReview.length ? 'warn' : 'good'} className="border-l border-line" />
          <StatusCard label="Sources" value={sourceReview.length} detail="need trust review" href="/founder/sources" tone={sourceReview.length ? 'warn' : 'good'} className="border-t border-line" />
          <StatusCard label="Context" value={activePacks.length} detail="active context packs" href="/founder/context" tone="brand" className="border-l border-t border-line" />
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-[1.05fr_0.95fr_0.9fr]">
        <section>
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[12.5px] font-semibold text-ink-2">Continue</h2><span className="text-[10.5px] uppercase tracking-[0.12em] text-ink-4">Next useful context</span></div>
          <div className="rounded-xl border border-line bg-surface px-4 sm:px-5">
            {readyHandoff ? <QuietRow href="/founder/handoffs" icon="connections" title={readyHandoff.title} meta={`→ ${readyHandoff.to_agent}`} tone="brand" /> : null}
            {recentCapture ? <QuietRow href="/founder/inbox" icon="inbox" title={recentCapture.title} meta="Inbox" /> : null}
            {nextPrivateTask ? <QuietRow href="/founder/work" icon="workspace" title={nextPrivateTask.title} meta={nextPrivateTask.due_date ? formatDate(nextPrivateTask.due_date) : 'Private'} /> : null}
            {nextCompanyTask ? <QuietRow href="/founder/work" icon="commitments" title={nextCompanyTask.title} meta={nextCompanyTask.due_date ? formatDate(nextCompanyTask.due_date) : 'KSP'} /> : null}
            {!readyHandoff && !recentCapture && !nextPrivateTask && !nextCompanyTask ? <div className="py-10 text-center"><p className="text-[13px] font-medium text-ink-2">A clean slate.</p><p className="mt-1 text-[11.5px] text-ink-4">Capture something above. Structure can come later.</p></div> : null}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[12.5px] font-semibold text-ink-2">Needs attention</h2><Link href="/founder/work" className="text-[11px] text-ink-4 hover:text-brand">Review work →</Link></div>
          <div className="rounded-xl border border-line bg-surface px-4 sm:px-5">
            <QuietRow href="/founder/truth" icon="decisions" title={`${truthReview.length} Truth ${truthReview.length === 1 ? 'item' : 'items'} to review`} tone={truthReview.length ? 'warn' : 'good'} />
            <QuietRow href="/founder/sources" icon="knowledge" title={`${sourceReview.length} ${sourceReview.length === 1 ? 'source' : 'sources'} need trust review`} tone={sourceReview.length ? 'warn' : 'good'} />
            <QuietRow href="/founder/handoffs" icon="connections" title={`${handoffOpen.length} ${handoffOpen.length === 1 ? 'handoff' : 'handoffs'} open`} tone={handoffOpen.length ? 'brand' : 'good'} />
            <QuietRow href="/founder/ai-inbox" icon="software" title={`${aiOpen.length} AI ${aiOpen.length === 1 ? 'request' : 'requests'} open`} tone={aiOpen.length ? 'brand' : 'good'} />
            <QuietRow href="/founder/work" icon="workspace" title={`${overduePrivate.length + overdueCompany.length} overdue · ${waiting.length} waiting`} tone={overduePrivate.length + overdueCompany.length ? 'risk' : waiting.length ? 'warn' : 'good'} />
          </div>
        </section>

        <section className="lg:col-span-2 xl:col-span-1">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[12.5px] font-semibold text-ink-2">Knowledge control</h2><Link href="/founder/knowledge" className="text-[11px] text-ink-4 hover:text-brand">Open Knowledge →</Link></div>
          <div className="rounded-xl border border-line bg-surface px-4 sm:px-5">
            <LayerRow href="/founder/truth" icon="decisions" title="Truth" value={truth.length} detail="Facts, decisions and assumptions with verification state." />
            <LayerRow href="/founder/sources" icon="knowledge" title="Sources" value={sources.length} detail="Provenance and trust for the information your AIs receive." />
            <LayerRow href="/founder/context" icon="workspace" title="Context Packs" value={activePacks.length} detail="Bounded, reusable context prepared for a specific AI job." />
          </div>
        </section>
      </div>

      <section className="mt-5 flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-ink-2">Human trust boundary</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-4">Connected AIs can capture, search and hand off work. Verified/private truth and trusted sources stay under your control.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/founder/handoffs" className="rounded-lg border border-line px-3 py-2 text-[11.5px] font-medium text-ink-2 hover:border-brand hover:text-brand">Handoffs</Link>
          <Link href="/founder/ai-access" className="rounded-lg bg-brand px-3 py-2 text-[11.5px] font-semibold text-on-brand hover:bg-brand-strong">AI Access</Link>
        </div>
      </section>
    </div>
  );
}
