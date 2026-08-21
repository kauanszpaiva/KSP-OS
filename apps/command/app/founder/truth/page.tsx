import Link from 'next/link';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { Icon } from '@ksp/ui';
import { getFounderTruth, type FounderTruthItem, type TruthStatus } from './data';
import { TruthCapture } from './_components/truth-capture';

export const dynamic = 'force-dynamic';

const STATUS_META: Record<TruthStatus, { label: string; dot: string; badge: string }> = {
  verified: { label: 'Verified', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  unverified: { label: 'Unverified', dot: 'bg-ink-4', badge: 'bg-surface-2 text-ink-3' },
  needs_review: { label: 'Needs review', dot: 'bg-brand', badge: 'bg-brand-tint text-brand' },
  conflict: { label: 'Conflict', dot: 'bg-risk', badge: 'bg-risk/10 text-risk' },
  stale: { label: 'Stale', dot: 'bg-warn', badge: 'bg-warn/10 text-ink-2' }
};

function TruthRow({ item }: { item: FounderTruthItem }) {
  const status = STATUS_META[item.status];
  return (
    <li className="grid gap-2 border-t border-line py-3 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} aria-hidden />
          <p className="truncate text-[13.5px] font-medium text-ink">{item.title}</p>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 pl-3.5 text-[11px] text-ink-4">
          <span className="capitalize">{item.item_type.replace('_', ' ')}</span>
          <span aria-hidden>·</span>
          <span>{item.confidence} confidence</span>
          {item.source_label ? <><span aria-hidden>·</span><span>{item.source_label}</span></> : null}
        </div>
        {item.content ? <p className="mt-1.5 line-clamp-2 pl-3.5 text-[12.5px] leading-5 text-ink-3">{item.content}</p> : null}
      </div>
      <div className="flex items-center gap-2 pl-3.5 sm:pl-0">
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${status.badge}`}>{status.label}</span>
      </div>
    </li>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone?: 'risk' | 'brand' }) {
  return (
    <div className="border-l border-line pl-3 first:border-l-0 first:pl-0">
      <p className={`tnum text-[21px] font-semibold leading-none ${tone === 'risk' ? 'text-risk' : tone === 'brand' ? 'text-brand' : 'text-ink'}`}>{value}</p>
      <p className="mt-1 text-[10.5px] text-ink-4">{label}</p>
    </div>
  );
}

export default async function FounderTruthPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const result = supabase ? await getFounderTruth(supabase) : { items: [], schemaAvailable: false };
  const items = result.items;

  const verified = items.filter((i) => i.status === 'verified');
  const assumptions = items.filter((i) => i.item_type === 'assumption');
  const needsReview = items.filter((i) => i.status === 'needs_review' || i.status === 'unverified' || i.status === 'stale');
  const conflicts = items.filter((i) => i.status === 'conflict');

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">Second Brain · Private</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-ink sm:text-[34px]">Truth</h1>
            <p className="mt-1 max-w-2xl text-[13.5px] leading-6 text-ink-3">Facts, decisions and assumptions with an explicit verification state. Nothing here becomes company truth automatically.</p>
          </div>
          <Link href="/founder/inbox" className="hidden rounded-lg border border-line px-3 py-2 text-[12px] font-medium text-ink-2 hover:border-brand hover:text-brand sm:inline-flex">Open Inbox</Link>
        </div>
      </header>

      {!result.schemaAvailable ? (
        <div className="mb-5 flex gap-3 rounded-xl border border-line bg-surface-2 p-4">
          <Icon name="signals" className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          <div>
            <p className="text-[13px] font-medium text-ink">Truth storage is prepared, not deployed in this environment.</p>
            <p className="mt-1 text-[12px] leading-5 text-ink-3">The interface stays safe while the additive founder-only migration remains behind the database reconciliation gate.</p>
          </div>
        </div>
      ) : null}

      <TruthCapture disabled={!result.schemaAvailable} />

      <section className="mt-5 rounded-2xl border border-line bg-surface px-4 py-4 sm:px-5">
        <div className="grid grid-cols-4 gap-3">
          <Count label="Verified" value={verified.length} />
          <Count label="Assumptions" value={assumptions.length} />
          <Count label="Review" value={needsReview.length} tone="brand" />
          <Count label="Conflicts" value={conflicts.length} tone={conflicts.length ? 'risk' : undefined} />
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="mb-2">
          <h2 className="text-[14px] font-semibold text-ink">Knowledge ledger</h2>
          <p className="mt-0.5 text-[11.5px] text-ink-4">Provenance and uncertainty stay visible instead of being hidden in AI memory.</p>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center">
            <Icon name="decisions" className="mx-auto h-6 w-6 text-ink-4" />
            <p className="mt-3 text-[13.5px] font-medium text-ink-2">No canonical knowledge yet.</p>
            <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-5 text-ink-4">Start with decisions you already made, facts you can prove, and assumptions you do not want an AI to mistake for facts.</p>
          </div>
        ) : (
          <ul>{items.map((item) => <TruthRow key={item.id} item={item} />)}</ul>
        )}
      </section>
    </div>
  );
}
