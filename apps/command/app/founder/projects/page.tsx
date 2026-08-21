import Link from 'next/link';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { PageHeader } from '../../(app)/_components/ui';
import { QuickCaptureForm } from '../brain/_components/forms';
import { getInboxItems } from '../data';

export const dynamic = 'force-dynamic';

export default async function FounderProjectsPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const items = supabase ? await getInboxItems(supabase) : [];
  const thoughts = items.filter((item) => item.item_type === 'project_thought' && item.triage_status !== 'archived');

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Private"
        title="Projects"
        description="Founder-only project thinking. Company project state stays in KSP Command; this page holds the private reasoning you do not want duplicated or exposed."
        action={<Link href="/missions" className="rounded-lg border border-line px-3 py-2 text-[12px] font-medium text-ink-2 hover:border-brand hover:text-brand">Company Projects →</Link>}
      />
      <QuickCaptureForm itemType="project_thought" placeholder="Project thought, risk, angle…" />
      <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface px-4 sm:px-5">
        {thoughts.length === 0 ? <p className="py-10 text-center text-[13px] text-ink-4">No private project thoughts yet.</p> : thoughts.map((item) => (
          <article key={item.id} className="py-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-ink-4"><span>{item.triage_status}</span><span>·</span><span>Private</span></div>
            <h2 className="mt-1 text-[14px] font-semibold text-ink">{item.title}</h2>
            {item.body && <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-ink-2">{item.body}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
