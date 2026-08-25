import { redirect } from 'next/navigation';
import { isKspIncOwner } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { PageHeader } from '../_components/ui';

const modules = [
  {
    title: 'Structure',
    status: 'Release-gated',
    description: 'KSP verticals, memberships and project classification. Administration stays disabled until database lineage and RLS gates prove the Business Unit foundation against the target environment.'
  },
  {
    title: 'People & Access',
    status: 'Foundation exists',
    description: 'Internal memberships, project scope, explicit grants and temporary access already exist. The next governed layer is effective-access explanation, grant/revoke workflows and access review.'
  },
  {
    title: 'KSP Network',
    status: 'Release-gated',
    description: 'Partner organizations, people and assignments remain behind the database synchronization gate. Network administration must not bypass the canonical KSP authorization chain.'
  },
  {
    title: 'Clients',
    status: 'Operational / consolidating',
    description: 'Portal identities and project visibility remain client-scoped. Client administration will move behind the same owner control plane without merging client and internal authorization contexts.'
  },
  {
    title: 'Audit',
    status: 'Foundation exists',
    description: 'Audit and activity records exist. The owner explorer and mandatory privileged-mutation audit contract are still part of the controlled rollout.'
  },
  {
    title: 'Platform',
    status: 'Needs reconciliation',
    description: 'Source, database migration state, Edge Functions and deployment revisions must resolve to one release manifest before the platform can report healthy.'
  }
] as const;

export default async function ControlCenterPage() {
  const ctx = await requireSession();
  if (!isKspIncOwner(ctx)) redirect('/home');

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="KSP INC · Owner control"
        title="KSP Control Center"
        description="One executive surface for structure, identities, access, KSP Network, clients, audit and platform readiness. Security remains enforced by server authorization and database RLS, not by this UI."
      />

      <section className="rounded-2xl border border-warn/25 bg-warn/5 p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-warn">Production safety gate</p>
            <h2 className="mt-1 text-[16px] font-semibold text-ink">Database-affecting administration is intentionally not exposed here yet.</h2>
            <p className="mt-1 text-[12px] leading-5 text-ink-3">
              This first Control Center slice is read-only by design. Business Unit and partner operations must pass lineage reconciliation, seeded staging replay and positive/negative authorization tests before privileged writes are enabled.
            </p>
          </div>
          <span className="rounded-full border border-warn/25 bg-surface px-3 py-1 text-[11px] font-semibold text-warn">Release gate active</span>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <article key={module.title} className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-ink">{module.title}</h2>
              <span className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[10px] font-semibold text-ink-3">{module.status}</span>
            </div>
            <p className="mt-3 text-[12px] leading-5 text-ink-3">{module.description}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">Target owner questions</p>
        <div className="mt-3 grid gap-2 text-[12px] text-ink-2 md:grid-cols-2">
          <p className="rounded-xl bg-surface-2 px-3 py-2.5">Who can administer KSP globally?</p>
          <p className="rounded-xl bg-surface-2 px-3 py-2.5">Which access expires soon?</p>
          <p className="rounded-xl bg-surface-2 px-3 py-2.5">Why does this person have this access?</p>
          <p className="rounded-xl bg-surface-2 px-3 py-2.5">Is source equal to the running platform?</p>
        </div>
      </section>
    </div>
  );
}
