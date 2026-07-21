import { redirect } from 'next/navigation';
import { canViewFounderVault } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate } from '../../../lib/format';
import { Card, EmptyState, PageHeader } from '../_components/ui';
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
    <div>
      <PageHeader
        eyebrow="Private"
        title="Founder Vault"
        description="Isolated to you. Excluded from company reporting, client systems, and team search."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          {entries.length === 0 ? (
            <EmptyState title="Your vault is empty." hint="Only you can ever see what you add here." />
          ) : (
            entries.map((e) => (
              <Card key={e.id}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">{e.title}</h3>
                  <span className="rounded-full bg-ksp-mist px-2 py-0.5 text-[11px] capitalize text-slate-500">{e.entry_type}</span>
                </div>
                {e.body && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{e.body}</p>}
                <p className="mt-2 text-xs text-slate-400">{formatDate(e.created_at)}</p>
              </Card>
            ))
          )}
        </div>
        <Card className="lg:sticky lg:top-6 lg:self-start">
          <h2 className="text-sm font-semibold text-ksp-navy">New private entry</h2>
          <p className="mb-4 mt-1 text-xs text-slate-500">Row-level security enforces founder-only, own-rows-only access.</p>
          <VaultForm />
        </Card>
      </div>
    </div>
  );
}
