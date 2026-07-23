import { isExecutive } from '@ksp/auth';
import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate, isOverdue } from '../../../lib/format';
import { getIntegrationConnections } from '../data';
import { EmptyState, PageHeader, Panel, StatePill } from '../_components/ui';
import { ConnectionForm, RevokeConnectionForm } from '../_components/control-forms';

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

      {connections.length === 0 ? (
        <EmptyState icon="connections" title="No connections yet." hint="Record the first provider connection to start tracking scopes and expiry." />
      ) : (
        <Reveal>
          <Panel className="divide-y divide-line">
            {connections.map((c) => {
              const expiring = c.token_expires_at ? isOverdue(c.token_expires_at) : false;
              return (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium capitalize text-ink">{c.provider}</p>
                    <p className="mt-0.5 truncate text-[12px] text-ink-3">
                      {c.scopes.length > 0 ? c.scopes.join(', ') : 'No scopes recorded'}
                      {c.token_expires_at && (
                        <span className={expiring ? 'text-risk' : ''}> · expires {formatDate(c.token_expires_at)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatePill state={c.status} />
                    {c.status === 'active' && <RevokeConnectionForm id={c.id} />}
                  </div>
                </div>
              );
            })}
          </Panel>
        </Reveal>
      )}
    </div>
  );
}
