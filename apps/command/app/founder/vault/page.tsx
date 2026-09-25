import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { ActivityStrip, DistributionBars, VizBoard, VizPanel, VisualGrid, bucketByDay, distribution } from '@ksp/ui';
import { PageHeader, Panel } from '../../(app)/_components/ui';
import { VaultForm } from '../../(app)/_components/vault-form';
import { FounderVaultView, type VaultEntry } from '../../(app)/_components/founder-vault-view';

export const dynamic = 'force-dynamic';

/** Entry window, charted from the vault rows this page already loaded. */
const VAULT_DAYS = 14;

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

  const typeMix = distribution(entries.map((entry) => entry.entry_type), { limit: 6, otherLabel: 'Other types' });
  const volume = bucketByDay(entries.map((entry) => entry.created_at), VAULT_DAYS, new Date());

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

      {entries.length > 0 ? (
        <VizBoard
          aside={`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`}
          className="mb-6"
          note={`Derived from the vault rows this page already loaded, over the last ${VAULT_DAYS} days`}
          title="Vault board"
        >
          <VisualGrid>
            <VizPanel index={0} note="entry_type recorded on each vault row" title="Entry type">
              <DistributionBars empty="No vault entry was returned." items={typeMix} tone="scale" />
            </VizPanel>
            <VizPanel index={1} note="Vault rows written per UTC day" title="Write volume">
              <ActivityStrip buckets={volume} caption="Vault entries per day" />
            </VizPanel>
          </VisualGrid>
        </VizBoard>
      ) : null}

      <FounderVaultView entries={entries} />
    </div>
  );
}
