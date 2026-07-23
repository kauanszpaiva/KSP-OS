import { redirect } from 'next/navigation';
import { canViewFounderVault } from '@ksp/auth';
import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate } from '../../../lib/format';
import { EmptyState, PageHeader, Panel } from '../_components/ui';
import { VaultForm } from '../_components/vault-form';

interface VaultEntry {
  id: string;
  entry_type: string;
  title: string;
  body: string | null;
  created_at: string;
}

export default async function FounderVaultPage() {
  const ctx = await requireSession();
  if (!canViewFounderVault(ctx)) redirect('/pulse');

  const supabase = await getServerSupabase();
  const { data } = supabase
    ? await supabase.from('founder_vault_entries').select('id, entry_type, title, body, created_at').order('created_at', { ascending: false })
    : { data: [] };
  const entries = (data ?? []) as VaultEntry[];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Private"
        title="Founder Vault"
        description="Yours alone. Isolated by row-level security — excluded from company reporting, client systems, and team search."
      />

      <Panel className="mb-10 p-5">
        <VaultForm />
      </Panel>

      {entries.length === 0 ? (
        <EmptyState icon="vault" title="Your vault is empty." hint="Only you can ever see what you write here." />
      ) : (
        <div className="space-y-8">
          {entries.map((e, i) => (
            <Reveal as="article" key={e.id} delay={Math.min(i, 8) * 40} className="grid grid-cols-[64px_1fr] gap-4 border-l border-line pl-5">
              <time className="tnum pt-1 text-[11.5px] uppercase tracking-wide text-ink-4">{formatDate(e.created_at)}</time>
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display text-[18px] font-semibold text-ink">{e.title}</h3>
                  <span className="text-[11px] uppercase tracking-wide text-ink-4">{e.entry_type}</span>
                </div>
                {e.body && <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">{e.body}</p>}
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
