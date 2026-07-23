import { isExecutive } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getIntegrationConnections } from '../data';
import { EmptyState, PageHeader } from '../_components/ui';
import { ConnectionForm } from '../_components/control-forms';
import { ConnectionsView } from '../_components/connections-view';

export default async function ConnectionsPage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();
  const connections = supabase ? await getIntegrationConnections(supabase) : [];
  const exec = isExecutive(ctx);

  if (!exec) {
    return (
      <div>
        <PageHeader eyebrow="Control" title="Connections" description="Integrations — executive-only." />
        <EmptyState icon="connections" title="Executive access only." hint="Connections manage credentials and scopes for the whole organization." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Control"
        title="Connections"
        description="Integration foundation — GitHub, Vercel, and similar providers. No OAuth flow yet; connections are recorded manually for now."
      />

      <details className="mb-6 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + Add connection
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4">
          <ConnectionForm />
        </div>
      </details>

      <ConnectionsView connections={connections} />
    </div>
  );
}
