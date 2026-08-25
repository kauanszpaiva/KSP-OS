'use client';

import Link from 'next/link';
import { useMemo, useState, useActionState } from 'react';
import type { PermissionAction } from '@ksp/permissions';
import type { AccessDirectoryData, AccessDirectoryPerson, PermissionGrantSummary, PartnerMembershipSummary } from '../data';
import {
  grantInternalPermission,
  revokeInternalPermission,
  revokePartnerMembership,
  setPartnerMembership,
  type AccessActionResult
} from '../actions';

const initial: AccessActionResult = { ok: false };

const PERMISSIONS: Array<{ value: PermissionAction; label: string; risk?: boolean }> = [
  { value: 'client.read', label: 'Clients · view' },
  { value: 'client.update', label: 'Clients · edit' },
  { value: 'client.internal_note.read', label: 'Clients · internal notes', risk: true },
  { value: 'project.read', label: 'Projects · view' },
  { value: 'project.manage', label: 'Projects · manage' },
  { value: 'project.publish', label: 'Projects · publish', risk: true },
  { value: 'request.submit', label: 'Requests · submit' },
  { value: 'request.triage', label: 'Requests · triage' },
  { value: 'change_order.draft', label: 'Change orders · draft' },
  { value: 'change_order.internal_approve', label: 'Change orders · internal approve', risk: true },
  { value: 'change_order.client_approve', label: 'Change orders · client approve', risk: true },
  { value: 'invoice.read', label: 'Invoices · view' },
  { value: 'invoice.pay', label: 'Invoices · pay', risk: true },
  { value: 'payment.refund', label: 'Payments · refund', risk: true },
  { value: 'document.upload', label: 'Documents · upload' },
  { value: 'document.download', label: 'Documents · download' },
  { value: 'document.publish', label: 'Documents · publish', risk: true },
  { value: 'finance.read', label: 'Finance · view', risk: true },
  { value: 'finance.post', label: 'Finance · post', risk: true },
  { value: 'finance.reconcile', label: 'Finance · reconcile', risk: true },
  { value: 'access.grant', label: 'Access · grant', risk: true },
  { value: 'access.revoke', label: 'Access · revoke', risk: true },
  { value: 'production.deploy', label: 'Production · deploy', risk: true }
];

const PARTNER_ROLES = [
  ['partner_owner', 'Partner owner'],
  ['partner_coordinator', 'Coordinator'],
  ['editor', 'Editor'],
  ['uploader', 'Uploader'],
  ['viewer', 'Viewer']
] as const;

const field = 'h-9 min-w-0 rounded-lg border border-line-2 bg-surface px-2.5 text-[11px] text-ink focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';
const button = 'h-9 rounded-lg border border-line-2 bg-surface px-3 text-[11px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50';

function labelForPermission(action: PermissionAction): string {
  return PERMISSIONS.find((permission) => permission.value === action)?.label ?? action;
}

function formatDate(value: string | null): string {
  if (!value) return 'No expiry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }).format(date);
}

function Feedback({ state }: { state: AccessActionResult }) {
  if (state.ok) return <span className="text-[10px] font-medium text-good">Saved.</span>;
  if (state.error) return <span className="text-[10px] font-medium text-risk">{state.error}</span>;
  return null;
}

function SurfaceBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span className={enabled
      ? 'rounded-full border border-brand/20 bg-brand-tint/55 px-2 py-0.5 text-[9.5px] font-semibold text-brand'
      : 'rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[9.5px] font-medium text-ink-4'}>
      {label}
    </span>
  );
}

function RevokePermission({ grant }: { grant: PermissionGrantSummary }) {
  const [state, action, pending] = useActionState(revokeInternalPermission, initial);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="grantId" value={grant.id} />
      <button type="submit" disabled={pending} className="rounded-md border border-risk/25 px-2 py-1 text-[9.5px] font-semibold text-risk hover:bg-risk-tint disabled:opacity-50">
        {pending ? 'Revoking…' : 'Revoke'}
      </button>
      <Feedback state={state} />
    </form>
  );
}

function PermissionGrantForm({ person, data, mfa }: { person: AccessDirectoryPerson; data: AccessDirectoryData; mfa: boolean }) {
  const [state, action, pending] = useActionState(grantInternalPermission, initial);
  const disabled = !mfa || person.owner || !person.internalRole || person.internalSuspended;
  return (
    <form action={action} className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-center">
      <input type="hidden" name="profileId" value={person.profileId} />
      <select name="action" aria-label={`Permission for ${person.displayName}`} className={field} defaultValue="project.read" disabled={disabled}>
        {PERMISSIONS.map((permission) => (
          <option key={permission.value} value={permission.value}>{permission.risk ? 'Sensitive · ' : ''}{permission.label}</option>
        ))}
      </select>
      <select name="projectId" aria-label={`Permission scope for ${person.displayName}`} className={field} defaultValue="" disabled={disabled}>
        <option value="">All KSP · organization-wide</option>
        {data.projects.map((project) => <option key={project.id} value={project.id}>Project · {project.name}</option>)}
      </select>
      <button type="submit" className={button} disabled={disabled || pending}>{pending ? 'Granting…' : 'Grant permission'}</button>
      <div className="lg:col-span-3">
        {!mfa ? <p className="text-[10px] text-risk">Step-up MFA is required before owner-level access changes.</p> : null}
        {person.owner ? <p className="text-[10px] text-ink-4">KSP INC owners already inherit the executive boundary; duplicate explicit grants are blocked.</p> : null}
        <Feedback state={state} />
      </div>
    </form>
  );
}

function RevokeNetwork({ membership }: { membership: PartnerMembershipSummary }) {
  const [state, action, pending] = useActionState(revokePartnerMembership, initial);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="membershipId" value={membership.membershipId} />
      <button type="submit" disabled={pending || membership.suspended} className="rounded-md border border-risk/25 px-2 py-1 text-[9.5px] font-semibold text-risk hover:bg-risk-tint disabled:opacity-50">
        {membership.suspended ? 'Inactive' : pending ? 'Revoking…' : 'Revoke'}
      </button>
      <Feedback state={state} />
    </form>
  );
}

function NetworkGrantForm({ person, data, mfa }: { person: AccessDirectoryPerson; data: AccessDirectoryData; mfa: boolean }) {
  const [state, action, pending] = useActionState(setPartnerMembership, initial);
  const disabled = !mfa || data.partnerOrganizations.length === 0;
  return (
    <form action={action} className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_auto] lg:items-center">
      <input type="hidden" name="profileId" value={person.profileId} />
      <select name="partnerOrganizationId" aria-label={`Network organization for ${person.displayName}`} className={field} defaultValue="" disabled={disabled} required>
        <option value="" disabled>Choose partner organization</option>
        {data.partnerOrganizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
      </select>
      <select name="role" aria-label={`Network role for ${person.displayName}`} className={field} defaultValue="viewer" disabled={disabled}>
        {PARTNER_ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <button type="submit" className={button} disabled={disabled || pending}>{pending ? 'Saving…' : 'Grant / update'}</button>
      <div className="lg:col-span-3">
        {data.partnerOrganizations.length === 0 ? <p className="text-[10px] text-ink-4">Create an active partner organization before assigning Network access.</p> : null}
        {!mfa ? <p className="text-[10px] text-risk">Step-up MFA is required before owner-level access changes.</p> : null}
        <Feedback state={state} />
      </div>
    </form>
  );
}

function AccessPerson({ person, data, mfa }: { person: AccessDirectoryPerson; data: AccessDirectoryData; mfa: boolean }) {
  const activeNetwork = person.network.filter((membership) => !membership.suspended);
  return (
    <details className="group border-b border-line last:border-b-0">
      <summary className="cursor-pointer list-none px-4 py-3.5 marker:hidden hover:bg-surface-2/50 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-[12.5px] font-semibold text-ink">{person.displayName}</p>
              {person.owner ? <span className="rounded-full bg-brand px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-on-brand">Owner</span> : null}
              {person.profileStatus !== 'active' || person.internalSuspended ? <span className="rounded-full border border-risk/20 bg-risk-tint px-2 py-0.5 text-[9px] font-semibold text-risk">Restricted</span> : null}
            </div>
            <p className="mt-0.5 truncate text-[10.5px] text-ink-4">{person.email || `Profile ${person.profileId.slice(0, 8)}`} {person.internalRole ? `· ${person.internalRole.replace(/_/g, ' ')}` : ''}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <SurfaceBadge label="INC" enabled={person.surfaces.inc} />
            <SurfaceBadge label="Command" enabled={person.surfaces.command} />
            <SurfaceBadge label="Portal" enabled={person.surfaces.portal} />
            <SurfaceBadge label="Network" enabled={person.surfaces.network} />
          </div>
          <span className="text-[12px] text-ink-4 transition-transform group-open:rotate-90">→</span>
        </div>
      </summary>

      <div className="border-t border-line bg-surface-2/30 px-4 py-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-4">
            <section>
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-ink-4">Why this person has access</p>
              <ul className="mt-2 space-y-1.5">
                {person.accessReasons.map((reason) => <li key={reason} className="text-[11px] leading-4 text-ink-2">• {reason}</li>)}
              </ul>
            </section>

            <section className="rounded-lg border border-line bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-ink">Command identity</p>
                  <p className="mt-1 text-[10.5px] text-ink-4">{person.internalRole ? `${person.internalRole.replace(/_/g, ' ')} · ${person.internalSuspended ? 'suspended' : 'active'}` : 'No internal membership'}</p>
                </div>
                <Link href="/team" className="text-[10px] font-semibold text-brand">Role & status →</Link>
              </div>
              <div className="mt-3 border-t border-line pt-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold text-ink">Division scopes</p>
                  <Link href="/divisions" className="text-[10px] font-semibold text-brand">Manage →</Link>
                </div>
                {person.owner ? (
                  <p className="mt-1.5 text-[10.5px] text-ink-3">Global owner · every KSP division.</p>
                ) : person.divisions.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">{person.divisions.map((division) => <span key={division.businessUnitId} className="rounded-md bg-surface-2 px-2 py-1 text-[9.5px] text-ink-2">{division.name} · {division.accessLevel}</span>)}</div>
                ) : <p className="mt-1.5 text-[10.5px] text-ink-4">No explicit division scope.</p>}
              </div>
              <div className="mt-3 border-t border-line pt-2.5">
                <p className="text-[10px] font-semibold text-ink">Project assignments</p>
                <p className="mt-1 text-[10.5px] text-ink-4">{person.projects.length ? person.projects.map((project) => `${project.name} (${project.role})`).join(' · ') : 'No direct internal project assignments.'}</p>
              </div>
            </section>

            <section className="rounded-lg border border-line bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-ink">Portal client scopes</p>
                  <p className="mt-1 text-[10.5px] text-ink-4">{person.portal.length ? `${person.portal.length} active client membership${person.portal.length === 1 ? '' : 's'}` : 'No Portal identity scope'}</p>
                </div>
                <Link href="/clients" className="text-[10px] font-semibold text-brand">Manage Portal →</Link>
              </div>
              {person.portal.length ? (
                <ul className="mt-2 space-y-1.5">
                  {person.portal.map((entry) => (
                    <li key={`${entry.clientId}:${entry.profileId}`} className="flex items-center justify-between gap-3 rounded-md bg-surface-2 px-2.5 py-2 text-[10px]">
                      <span className="min-w-0 truncate font-medium text-ink-2">{entry.clientName} · {entry.role.replace(/^client_/, '').replace(/_/g, ' ')}</span>
                      <span className="shrink-0 text-ink-4">{entry.projects.filter((project) => project.enabled).length}/{entry.projects.length} projects</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-lg border border-line bg-surface p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-ink">Explicit Command permissions</p>
                  <p className="mt-1 max-w-2xl text-[10.5px] leading-4 text-ink-4">Use grants only when role + division + project assignment is not enough. Organization-wide grants are intentionally high impact.</p>
                </div>
                <span className="tnum rounded-full bg-surface-2 px-2 py-0.5 text-[9.5px] text-ink-3">{person.permanentGrants.length} active</span>
              </div>
              {person.permanentGrants.length ? (
                <ul className="mt-3 space-y-2">
                  {person.permanentGrants.map((grant) => (
                    <li key={grant.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface-2/55 px-2.5 py-2">
                      <div>
                        <p className="text-[10px] font-semibold text-ink-2">{labelForPermission(grant.action)}</p>
                        <p className="mt-0.5 text-[9.5px] text-ink-4">{grant.resourceName ?? 'Scoped resource'} · {formatDate(grant.effectiveUntil)}</p>
                      </div>
                      <RevokePermission grant={grant} />
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-[10.5px] text-ink-4">No explicit permanent grants.</p>}
              <PermissionGrantForm person={person} data={data} mfa={mfa} />
            </section>

            <section className="rounded-lg border border-line bg-surface p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-ink">Network memberships</p>
                  <p className="mt-1 text-[10.5px] text-ink-4">Partner organization + role controls the Network identity. Assignment scope stays separate.</p>
                </div>
                <span className="tnum rounded-full bg-surface-2 px-2 py-0.5 text-[9.5px] text-ink-3">{activeNetwork.length} active</span>
              </div>
              {person.network.length ? (
                <ul className="mt-3 space-y-2">
                  {person.network.map((membership) => (
                    <li key={membership.membershipId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface-2/55 px-2.5 py-2">
                      <div>
                        <p className="text-[10px] font-semibold text-ink-2">{membership.partnerOrganizationName} · {membership.role.replace(/_/g, ' ')}</p>
                        <p className="mt-0.5 text-[9.5px] text-ink-4">{membership.openAssignmentCount}/{membership.assignmentCount} open assignments · {membership.suspended ? 'inactive' : formatDate(membership.effectiveUntil)}</p>
                      </div>
                      <RevokeNetwork membership={membership} />
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-[10.5px] text-ink-4">No Network memberships.</p>}
              <NetworkGrantForm person={person} data={data} mfa={mfa} />
            </section>

            <section className="rounded-lg border border-risk/15 bg-risk-tint/35 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-ink">Temporary grants · read only</p>
                  <p className="mt-1 max-w-2xl text-[10.5px] leading-4 text-ink-3">Mutation is intentionally disabled until the database policy is narrowed from any internal member to the reviewed owner/executive boundary.</p>
                </div>
                <span className="tnum rounded-full bg-surface px-2 py-0.5 text-[9.5px] text-ink-3">{person.temporaryGrants.length} active</span>
              </div>
              {person.temporaryGrants.length ? (
                <ul className="mt-2 space-y-1.5">
                  {person.temporaryGrants.map((grant) => (
                    <li key={grant.id} className="text-[10px] text-ink-2">{labelForPermission(grant.action)} · {grant.resourceName} · expires {formatDate(grant.effectiveUntil)}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </details>
  );
}

export function AccessManager({ data, mfa }: { data: AccessDirectoryData; mfa: boolean }) {
  const [query, setQuery] = useState('');
  const [surface, setSurface] = useState<'all' | 'inc' | 'command' | 'portal' | 'network'>('all');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return data.people.filter((person) => {
      if (surface !== 'all' && !person.surfaces[surface]) return false;
      if (!normalized) return true;
      const haystack = [
        person.displayName,
        person.email,
        person.internalRole ?? '',
        ...person.divisions.map((division) => division.name),
        ...person.portal.map((entry) => entry.clientName),
        ...person.network.map((membership) => membership.partnerOrganizationName)
      ].join(' ').toLowerCase();
      return haystack.includes(normalized);
    });
  }, [data.people, query, surface]);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Identity & effective access</h2>
          <p className="mt-0.5 text-[10.5px] text-ink-4">Expand a person to see exactly which memberships and grants produce their access.</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search person, client, division, partner…" className={`${field} sm:w-72`} />
          <select value={surface} onChange={(event) => setSurface(event.target.value as typeof surface)} className={field} aria-label="Filter access surface">
            <option value="all">All surfaces</option>
            <option value="inc">KSP INC</option>
            <option value="command">Command</option>
            <option value="portal">Portal</option>
            <option value="network">Network</option>
          </select>
        </div>
      </div>

      {!mfa ? (
        <div className="border-b border-risk/20 bg-risk-tint/45 px-4 py-2.5 text-[10.5px] text-risk">
          You can audit access now, but grants and revocations are locked until this owner session completes MFA step-up.
        </div>
      ) : null}

      {data.temporaryGrantMutationBlocked ? (
        <div className="border-b border-line bg-surface-2/55 px-4 py-2.5 text-[10.5px] leading-4 text-ink-3">
          Temporary access is visible for audit but deliberately not editable in this release slice because its current staging RLS is broader than the KSP INC owner boundary.
        </div>
      ) : null}

      <div>
        {filtered.length ? filtered.map((person) => <AccessPerson key={person.profileId} person={person} data={data} mfa={mfa} />) : (
          <p className="px-4 py-8 text-center text-[11.5px] text-ink-4">No identities match this filter.</p>
        )}
      </div>
    </section>
  );
}
