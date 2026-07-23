import { redirect } from 'next/navigation';
import { canViewFounderVault } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { PageHeader, Panel } from '../_components/ui';
import { VaultForm } from '../_components/vault-form';
import { FounderVaultView, type VaultEntry } from '../_components/founder-vault-view';

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

      <FounderVaultView entries={entries} />
    </div>
  );
}
