import Link from 'next/link';
import { DistributionBars, Icon, VizBoard, VizPanel, VisualEmpty, VisualGrid, distribution } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { PageHeader } from '../../(app)/_components/ui';
import { getContextPacks, getSources, getTruthItems, searchBrain } from '../brain/data';

export const dynamic = 'force-dynamic';

function LayerLink({ href, icon, title, detail, count }: { href: string; icon: 'decisions' | 'knowledge' | 'workspace'; title: string; detail: string; count: number }) {
  return (
    <Link href={href} className="group rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-3 group-hover:text-brand"><Icon name={icon} className="h-[18px] w-[18px]" /></span>
        <div className="min-w-0 flex-1"><h2 className="text-[14px] font-semibold text-ink">{title}</h2><p className="mt-1 text-[12px] leading-5 text-ink-3">{detail}</p></div>
        <span className="tnum text-[12px] text-ink-4">{count}</span>
      </div>
    </Link>
  );
}

const EXPLORE = [
  ['/founder/ideas', 'Ideas'], ['/founder/projects', 'Projects'], ['/founder/handoffs', 'Handoffs'],
  ['/founder/ai-access', 'AI Access / MCP'], ['/founder/ai-inbox', 'AI Inbox'], ['/founder/vault', 'Vault']
] as const;

export default async function FounderKnowledgePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireSession();
  const supabase = await getServerSupabase();
  const { q = '' } = await searchParams;
  const [truth, sources, packs, results] = supabase
    ? await Promise.all([getTruthItems(supabase), getSources(supabase), getContextPacks(supabase), q.trim().length >= 2 ? searchBrain(supabase, q) : Promise.resolve([])])
    : [[], [], [], []];

  // Layer sizes are real row counts; the ratios are each layer's share of the private brain as loaded here.
  const activePacks = packs.filter((pack) => pack.status === 'active').length;
  const layers = [
    { label: 'Truth', value: truth.length, href: '/founder/truth' },
    { label: 'Sources', value: sources.length, href: '/founder/sources' },
    { label: 'Active context packs', value: activePacks, href: '/founder/context' }
  ];
  const layerTotal = layers.reduce((acc, layer) => acc + layer.value, 0);
  const layerMix = layers.map((layer) => ({
    label: layer.label,
    value: layer.value,
    ratio: layerTotal === 0 ? 0 : layer.value / layerTotal
  }));
  const resultKindMix = distribution(results.map((result) => result.kind), { limit: 6, otherLabel: 'Other kinds' });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Private · Second Brain" title="Knowledge" description="Search the private brain, then go deeper only when you need to verify a claim, inspect provenance, or prepare context for another AI." />

      <form action="/founder/knowledge" method="get" className="flex gap-2 rounded-2xl border border-line bg-surface p-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-1"><Icon name="search" className="h-4 w-4 shrink-0 text-ink-4" /><input name="q" defaultValue={q} placeholder="Search ideas, truth, sources, context, handoffs…" className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-4" /></div>
        <button className="rounded-lg bg-ink px-4 py-2 text-[12px] font-semibold text-canvas hover:bg-brand">Search</button>
      </form>

      {q.trim().length >= 2 && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[13px] font-semibold text-ink">Search results</h2><span className="text-[11.5px] text-ink-4">{results.length}</span></div>
          <div className="divide-y divide-line rounded-2xl border border-line bg-surface px-4 sm:px-5">
            {results.length === 0 ? <p className="py-8 text-center text-[13px] text-ink-4">No private brain matches.</p> : results.map((result) => (
              <Link key={`${result.kind}-${result.id}`} href={result.href} className="flex items-start gap-3 py-3.5">
                <span className="mt-0.5 rounded-md bg-surface-2 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-4">{result.kind}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium text-ink-2">{result.title}</span>{result.detail && <span className="mt-0.5 block line-clamp-2 text-[11.5px] text-ink-4">{result.detail}</span>}</span>
                {result.status && <span className="shrink-0 text-[10px] text-ink-4">{result.status}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-7">
        <h2 className="mb-2 text-[13px] font-semibold text-ink">Knowledge layers</h2>

        {layerTotal > 0 ? (
          <VizBoard
            className="mb-3"
            note={`Derived from the ${layerTotal} private rows this page already loaded — a layer with no rows is dropped, never drawn as zero`}
            title="Brain board"
          >
            <VisualGrid>
              <VizPanel index={0} note="Each layer's share of the private brain as loaded here" title="Layer size">
                <DistributionBars empty="No private row was returned for any layer." items={layerMix} tone="scale" />
              </VizPanel>

              <VizPanel index={1} note="Kind of each match in the current search" title="Matches by kind">
                {q.trim().length >= 2 ? (
                  <DistributionBars empty="This search returned no match." items={resultKindMix} tone="scale" />
                ) : (
                  <VisualEmpty>Search the brain above with at least two characters to see how the matches break down.</VisualEmpty>
                )}
              </VizPanel>
            </VisualGrid>
          </VizBoard>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <LayerLink href="/founder/truth" icon="decisions" title="Truth" detail="Claims with verification, confidence and provenance." count={truth.length} />
          <LayerLink href="/founder/sources" icon="knowledge" title="Sources" detail="Where information came from and how much it is trusted." count={sources.length} />
          <LayerLink href="/founder/context" icon="workspace" title="Context Packs" detail="Bounded context packages prepared for AI work." count={packs.filter((pack) => pack.status === 'active').length} />
        </div>
      </section>

      <section className="mt-7">
        <h2 className="mb-2 text-[13px] font-semibold text-ink">Explore the Brain</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {EXPLORE.map(([href, label]) => <Link key={href} href={href} className="rounded-xl border border-line bg-surface px-3 py-3 text-[12px] font-medium text-ink-2 hover:border-brand hover:text-brand">{label}</Link>)}
        </div>
      </section>

      <section className="mt-7 rounded-2xl border border-line bg-surface px-5 py-4">
        <p className="text-[12px] font-medium text-ink-2">Truth hierarchy</p>
        <p className="mt-1 text-[12px] leading-5 text-ink-4">Verified private knowledge helps your AIs reason consistently, but it still does not override KSP Canon or automatically become company truth.</p>
      </section>
    </div>
  );
}
