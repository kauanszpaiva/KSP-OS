import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { PageHeader } from '../../(app)/_components/ui';
import { SourceForm } from '../brain/_components/forms';
import { setSourceTrust } from '../brain/actions';
import { getSources } from '../brain/data';

export const dynamic = 'force-dynamic';

const TRUST_OPTIONS = [
  ['primary', 'Primary'],
  ['trusted', 'Trusted'],
  ['unverified', 'Unverified'],
  ['conflict', 'Conflict']
] as const;

export default async function FounderSourcesPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const sources = supabase ? await getSources(supabase) : [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Private · Knowledge"
        title="Sources"
        description="A provenance catalog for the things your AIs are allowed to rely on. AI-added sources stay unverified until you review their trust here."
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
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-ink-4">
                  <span>{source.source_type}</span>
                  <span>·</span>
                  <span className={source.trust_status === 'conflict' ? 'font-semibold text-risk' : ['primary', 'trusted'].includes(source.trust_status) ? 'font-semibold text-success' : ''}>{source.trust_status}</span>
                  {source.source_date && <><span>·</span><span>{source.source_date}</span></>}
                </div>
                <h3 className="mt-1 text-[14px] font-semibold text-ink">{source.title}</h3>
                {source.summary && <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-ink-2">{source.summary}</p>}
                {source.locator && <p className="mt-2 break-all text-[11px] text-ink-4">{source.locator}</p>}
              </div>

              <form action={setSourceTrust} className="flex shrink-0 items-center gap-1.5">
                <input type="hidden" name="id" value={source.id} />
                <label htmlFor={`source-trust-${source.id}`} className="sr-only">Trust status for {source.title}</label>
                <select
                  id={`source-trust-${source.id}`}
                  name="trustStatus"
                  defaultValue={source.trust_status}
                  className="rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-[11px] text-ink-2 outline-none focus:border-brand"
                >
                  {TRUST_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-ink-2 hover:border-brand hover:text-brand">Save</button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
