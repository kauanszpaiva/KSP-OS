import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { PageHeader } from '../../(app)/_components/ui';
import { ContextPackForm } from '../brain/_components/forms';
import { archiveContextPack } from '../brain/actions';
import { getContextPacks, getContextPackSources, getSources } from '../brain/data';

export const dynamic = 'force-dynamic';

export default async function FounderContextPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const [packs, sources, links] = supabase
    ? await Promise.all([getContextPacks(supabase), getSources(supabase), getContextPackSources(supabase)])
    : [[], [], []];
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Private · AI Context"
        title="Context Packs"
        description="Reusable, bounded context for an AI or job. A pack says what is known, what is constrained, and which sources support it — without dumping your whole brain into every model."
      />
      <ContextPackForm sources={sources} />

      <div className="mt-7 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-ink">Reusable context</h2>
        <span className="text-[11.5px] text-ink-4">{packs.filter((pack) => pack.status === 'active').length} active</span>
      </div>
      <div className="mt-2 space-y-3">
        {packs.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface py-10 text-center text-[13px] text-ink-4">No context packs yet.</div>
        ) : packs.map((pack) => {
          const attached = links.filter((link) => link.context_pack_id === pack.id).map((link) => sourceById.get(link.source_id)).filter(Boolean);
          return (
            <article key={pack.id} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-ink-4"><span>{pack.status}</span><span>·</span><span>{attached.length} sources</span></div>
                  <h3 className="mt-1 text-[14px] font-semibold text-ink">{pack.title}</h3>
                  {pack.purpose && <p className="mt-1 text-[12px] text-ink-3">{pack.purpose}</p>}
                </div>
                {pack.status === 'active' && (
                  <form action={archiveContextPack}>
                    <input type="hidden" name="id" value={pack.id} />
                    <button className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-ink-3 hover:border-brand hover:text-brand">Archive</button>
                  </form>
                )}
              </div>
              <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-mono text-[11.5px] leading-5 text-ink-2">{pack.content}</pre>
              {attached.length > 0 && <p className="mt-3 text-[11px] text-ink-4">Sources: {attached.map((source) => source?.title).join(' · ')}</p>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
