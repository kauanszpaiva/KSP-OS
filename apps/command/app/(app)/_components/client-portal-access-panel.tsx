import { Icon } from '@ksp/ui';
import type { ClientPortalAccessEntry, PendingPortalInvitation } from '../clients/portal-access-data';
import {
  removePortalMember,
  resendPortalInvitation,
  revokePortalInvitation,
  setPortalProjectAccess,
  updatePortalMemberRole
} from '../clients/portal-access-actions';
import { Panel } from './ui';

const CLIENT_ROLES = [
  ['client_owner', 'Owner'],
  ['client_project_approver', 'Project approver'],
  ['client_billing_contact', 'Billing contact'],
  ['client_collaborator', 'Collaborator'],
  ['client_viewer', 'Viewer']
] as const;

function roleLabel(role: string): string {
  return CLIENT_ROLES.find(([value]) => value === role)?.[1] ?? role.replace(/^client_/, '').replace(/_/g, ' ');
}

function formatWhen(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short'
  }).format(date);
}

function ProjectAccessControl({ entry }: { entry: ClientPortalAccessEntry }) {
  return (
    <div className="mt-3 rounded-lg border border-line bg-surface px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-4">Project visibility</p>
        <span className="tnum text-[10px] text-ink-4">{entry.projects.filter((project) => project.enabled).length}/{entry.projects.length} allowed</span>
      </div>
      {entry.projects.length === 0 ? (
        <p className="mt-2 text-[11px] text-ink-4">No projects are linked to this client yet.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {entry.projects.map((project) => (
            <li key={project.projectId} className="flex items-center justify-between gap-3 rounded-md bg-surface-2/55 px-2.5 py-2">
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-medium text-ink">{project.name}</p>
                <p className="mt-0.5 text-[9.5px] capitalize text-ink-4">{project.status.replace(/_/g, ' ')}</p>
              </div>
              <form action={setPortalProjectAccess}>
                <input type="hidden" name="clientId" value={entry.clientId} />
                <input type="hidden" name="profileId" value={entry.profileId} />
                <input type="hidden" name="projectId" value={project.projectId} />
                <input type="hidden" name="enabled" value={project.enabled ? 'false' : 'true'} />
                <button
                  type="submit"
                  className={project.enabled
                    ? 'shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100'
                    : 'shrink-0 rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold text-ink-3 hover:border-brand hover:text-brand'}
                >
                  {project.enabled ? 'Visible' : 'Hidden'}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[10px] leading-relaxed text-ink-4">Visibility is an access gate. A project still appears in the Portal only after KSP publishes client-safe project content.</p>
    </div>
  );
}

function MemberAccessCard({ entry }: { entry: ClientPortalAccessEntry }) {
  return (
    <li className="min-w-0 rounded-lg border border-line bg-surface-2/45 px-3 py-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-ink">{entry.displayName}</p>
          <p className="mt-0.5 truncate text-[11px] text-ink-3">{entry.email}</p>
        </div>
        <span className="shrink-0 rounded-full border border-line bg-surface px-2 py-0.5 text-[9.5px] font-medium text-ink-3">{roleLabel(entry.role)}</span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <form action={updatePortalMemberRole} className="flex min-w-0 items-center gap-2">
          <input type="hidden" name="clientId" value={entry.clientId} />
          <input type="hidden" name="profileId" value={entry.profileId} />
          <select name="role" defaultValue={entry.role} className="h-8 min-w-0 flex-1 rounded-md border border-line bg-surface px-2 text-[10.5px] text-ink focus:border-brand focus:outline-none">
            {CLIENT_ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="submit" className="h-8 rounded-md border border-line bg-surface px-2.5 text-[10.5px] font-semibold text-ink-2 hover:border-brand hover:text-brand">Save role</button>
        </form>

        <details className="relative">
          <summary className="flex h-8 cursor-pointer list-none items-center rounded-md border border-red-200 bg-red-50 px-2.5 text-[10.5px] font-semibold text-red-700 marker:hidden hover:bg-red-100 [&::-webkit-details-marker]:hidden">Remove access</summary>
          <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-red-200 bg-surface p-3 shadow-card">
            <p className="text-[11px] leading-relaxed text-ink-2">Remove this person from <strong>{entry.clientName}</strong>? Their project grants and pending invites for this client will also be revoked.</p>
            <form action={removePortalMember} className="mt-2">
              <input type="hidden" name="clientId" value={entry.clientId} />
              <input type="hidden" name="profileId" value={entry.profileId} />
              <button type="submit" className="w-full rounded-md bg-red-600 px-3 py-1.5 text-[10.5px] font-semibold text-white hover:bg-red-700">Confirm removal</button>
            </form>
          </div>
        </details>
      </div>

      <ProjectAccessControl entry={entry} />
    </li>
  );
}

function PendingInvitations({ invitations }: { invitations: PendingPortalInvitation[] }) {
  if (invitations.length === 0) return null;

  return (
    <div className="border-t border-line px-4 py-3.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[12px] font-semibold text-ink">Pending invitations</h3>
          <p className="mt-0.5 text-[10.5px] text-ink-4">Email delivery, expiry and revocation are tracked here.</p>
        </div>
        <span className="tnum text-[10.5px] text-ink-4">{invitations.length} pending</span>
      </div>
      <ul className="grid gap-2 lg:grid-cols-2">
        {invitations.map((invitation) => (
          <li key={invitation.invitationId} className="rounded-lg border border-line bg-surface-2/45 px-3 py-2.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-medium text-ink">{invitation.email}</p>
                <p className="mt-0.5 text-[10px] text-ink-4">{invitation.clientName} · {roleLabel(invitation.role)}</p>
              </div>
              <span className={invitation.deliveryStatus === 'sent'
                ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-700'
                : 'rounded-full bg-amber-50 px-2 py-0.5 text-[9.5px] font-semibold text-amber-700'}>
                {invitation.deliveryStatus === 'sent' ? 'Email sent' : invitation.deliveryStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="mt-2 text-[9.5px] text-ink-4">Sent {formatWhen(invitation.emailSentAt)} · Expires {formatWhen(invitation.expiresAt)}</p>
            {invitation.emailLastError ? <p className="mt-1 line-clamp-2 text-[9.5px] text-red-600">{invitation.emailLastError}</p> : null}
            <div className="mt-2 flex items-center gap-2">
              <form action={resendPortalInvitation}>
                <input type="hidden" name="invitationId" value={invitation.invitationId} />
                <button type="submit" className="rounded-md border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold text-ink-2 hover:border-brand hover:text-brand">Resend email</button>
              </form>
              <form action={revokePortalInvitation}>
                <input type="hidden" name="invitationId" value={invitation.invitationId} />
                <button type="submit" className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100">Revoke</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ClientPortalAccessPanel({ entries, pendingInvitations = [] }: { entries: ClientPortalAccessEntry[]; pendingInvitations?: PendingPortalInvitation[] }) {
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
    <Panel className="mb-5 overflow-visible">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="clients" className="h-4 w-4 text-brand" />
            <h2 className="text-[13px] font-semibold text-ink">Portal access control</h2>
          </div>
          <p className="mt-1 max-w-3xl text-[11.5px] text-ink-4">Control each client identity, role and project visibility. Hidden projects are removed at the data-policy layer, not only from the interface.</p>
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
                <span className="tnum shrink-0 text-[10.5px] text-ink-4">{group.entries.length} identity{group.entries.length === 1 ? '' : 'ies'}</span>
              </div>
              <ul className="grid gap-2 xl:grid-cols-2">
                {group.entries.map((entry) => <MemberAccessCard key={`${entry.clientId}:${entry.profileId}`} entry={entry} />)}
              </ul>
            </section>
          ))}
        </div>
      )}

      <PendingInvitations invitations={pendingInvitations} />
    </Panel>
  );
}
