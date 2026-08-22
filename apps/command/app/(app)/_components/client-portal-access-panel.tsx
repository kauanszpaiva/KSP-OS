import { Icon } from '@ksp/ui';
import { Panel } from './ui';

export interface ClientPortalAccessEntry {
  clientId: string;
  clientName: string;
  profileId: string;
  displayName: string;
  email: string;
  role: string;
}

function roleLabel(role: string): string {
  return role
    .replace(/^client_/, '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function ClientPortalAccessPanel({ entries }: { entries: ClientPortalAccessEntry[] }) {
  const grouped = new Map<string, { clientName: string; entries: ClientPortalAccessEntry[] }>();
  for (const entry of entries) {
    const group = grouped.get(entry.clientId) ?? { clientName: entry.clientName, entries: [] };
    group.entries.push(entry);
    grouped.set(entry.clientId, group);
  }

  const groups = [...grouped.entries()]
    .map(([clientId, group]) => ({
      clientId,
      clientName: group.clientName,
      entries: [...group.entries].sort((a, b) => a.email.localeCompare(b.email))
    }))
    .sort((a, b) => a.clientName.localeCompare(b.clientName));

  return (
    <Panel className="mb-5 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="key" className="h-4 w-4 text-brand" />
            <h2 className="text-[13px] font-semibold text-ink">Portal access by client</h2>
          </div>
          <p className="mt-1 text-[11.5px] text-ink-4">Active email identities that can sign in to each client workspace.</p>
        </div>
        <span className="tnum rounded-full bg-surface-2 px-2.5 py-1 text-[10.5px] font-medium text-ink-3">{entries.length} active</span>
      </div>

      {groups.length === 0 ? (
        <p className="px-4 py-4 text-[12.5px] text-ink-4">No active Portal access is assigned yet.</p>
      ) : (
        <div className="divide-y divide-line">
          {groups.map((group) => (
            <section key={group.clientId} className="px-4 py-3.5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="min-w-0 truncate text-[12.5px] font-semibold text-ink">{group.clientName}</h3>
                <span className="tnum shrink-0 text-[10.5px] text-ink-4">{group.entries.length} access{group.entries.length === 1 ? '' : 'es'}</span>
              </div>
              <ul className="grid gap-2 lg:grid-cols-2">
                {group.entries.map((entry) => (
                  <li key={`${entry.clientId}:${entry.profileId}`} className="min-w-0 rounded-lg border border-line bg-surface-2/45 px-3 py-2.5">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-ink">{entry.displayName}</p>
                        <p className="mt-0.5 truncate text-[11px] text-ink-3">{entry.email}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-line bg-surface px-2 py-0.5 text-[9.5px] font-medium text-ink-3">{roleLabel(entry.role)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Panel>
  );
}
