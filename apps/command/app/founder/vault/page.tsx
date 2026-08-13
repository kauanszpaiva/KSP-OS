import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { PageHeader, Panel } from '../../(app)/_components/ui';
import { VaultForm } from '../../(app)/_components/vault-form';
import { FounderVaultView, type VaultEntry } from '../../(app)/_components/founder-vault-view';

export const dynamic = 'force-dynamic';

/**
 * Founder Vault inside the Founder OS shell. Reuses the existing
 * founder_vault_entries backing and its components verbatim — no schema change,
 * existing rows preserved. The layout gate already enforces founder-only access.
 */
export default async function FounderVaultPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const { data } = supabase
    ? await supabase
        .from('founder_vault_entries')
        .select('id, entry_type, title, body, created_at')
        .order('created_at', { ascending: false })
    : { data: [] };
  const entries = (data ?? []) as VaultEntry[];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Private"
        title="Vault"
        description="Yours alone. Isolated by row-level security — excluded from company reporting, client systems, and team search."
      />
      <Panel className="mb-10 p-5">
        <VaultForm />
      </Panel>
      <FounderVaultView entries={entries} />
    </div>
  );
}
