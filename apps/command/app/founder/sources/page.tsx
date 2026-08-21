import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { PageHeader } from '../../(app)/_components/ui';
import { SourceForm } from '../brain/_components/forms';
import { getSources } from '../brain/data';

export const dynamic = 'force-dynamic';

export default async function FounderSourcesPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const sources = supabase ? await getSources(supabase) : [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Private · Knowledge"
        title="Sources"
        description="A provenance catalog for the things your AIs are allowed to rely on. Save what a source is, where it came from, and how much you trust it."
      />
      <SourceForm />

      <div className="mt-7 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-ink">Source library</h2>
        <span className="text-[11.5px] text-ink-4">{sources.length} sources</span>
      </div>
      <div className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface px-4 sm:px-5">
        {sources.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink-4">No sources saved yet.</p>
        ) : sources.map((source) => (
          <article key={source.id} className="py-4">
            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-ink-4">
              <span>{source.source_type}</span>
              <span>·</span>
              <span className={source.trust_status === 'conflict' ? 'font-semibold text-risk' : source.trust_status === 'primary' ? 'font-semibold text-success' : ''}>{source.trust_status}</span>
              {source.source_date && <><span>·</span><span>{source.source_date}</span></>}
            </div>
            <h3 className="mt-1 text-[14px] font-semibold text-ink">{source.title}</h3>
            {source.summary && <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-ink-2">{source.summary}</p>}
            {source.locator && <p className="mt-2 break-all text-[11px] text-ink-4">{source.locator}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
