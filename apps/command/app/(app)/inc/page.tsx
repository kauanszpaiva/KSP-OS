import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isExecutive } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getMembersAdmin } from '../data';
import { PageHeader } from '../_components/ui';

const OWNER_ROLES = new Set(['founder_ceo', 'executive_operations']);

const ROLE_LABELS: Record<string, string> = {
  founder_ceo: 'Founder & CEO',
  executive_operations: 'Executive Operations',
  project_manager: 'Project Manager',
  department_lead: 'Department Lead',
  developer: 'Developer',
  designer: 'Designer',
  sales_specialist: 'Sales',
  contractor: 'Contractor',
  freelancer: 'Freelancer',
  intern: 'Intern'
};

const apps = [
  {
    name: 'KSP Command',
    audience: 'Internal KSP operations',
    description: 'Projects, people, finance, clients, delivery, decisions and company operations.',
    manageHref: '/home',
    manageLabel: 'Open Command'
  },
  {
    name: 'KSP Client Portal',
    audience: 'Clients',
    description: 'Client-safe projects, approvals, deliverables, invoices, meetings and published information.',
    manageHref: '/clients',
    manageLabel: 'Manage clients'
  },
  {
    name: 'KSP Network',
    audience: 'Subcontractors & partners',
    description: 'Partner organizations, assignments and scoped collaboration without exposing internal KSP access.',
    manageHref: '/connections',
    manageLabel: 'Manage connections'
  }
] as const;

const controls = [
  {
    title: 'People & roles',
    description: 'Manage internal roles, suspension and team access. Owner authority is enforced by the server, not by this screen.',
    href: '/team',
    label: 'Manage people'
  },
  {
    title: 'Divisions & access',
    description: 'Create KSP operating arms, classify projects and grant or revoke division memberships.',
    href: '/divisions',
    label: 'Manage structure'
  },
  {
    title: 'Clients & Portal access',
    description: 'Keep client identities isolated from internal KSP access and manage each client workspace separately.',
    href: '/clients',
    label: 'Manage clients'
  },
  {
    title: 'Finance',
    description: 'Owner-level financial control stays separate from ordinary team visibility and operational permissions.',
    href: '/finance',
    label: 'Open finance'
  },
  {
    title: 'Apps & integrations',
    description: 'Review connected systems and the integration surface used across the KSP operating environment.',
    href: '/connections',
    label: 'Open connections'
  },
  {
    title: 'Audit & platform',
    description: 'Use the owner layer as the place to reconcile access, platform readiness and privileged operating changes.',
    href: '/inc#platform',
    label: 'Review platform'
  }
] as const;

function isActiveWindow(effectiveFrom: string | null, effectiveUntil: string | null, suspendedAt: string | null) {
  if (suspendedAt) return false;
  const now = Date.now();
  if (effectiveFrom) {
    const startsAt = Date.parse(effectiveFrom);
    if (Number.isFinite(startsAt) && startsAt > now) return false;
  }
  if (effectiveUntil) {
    const endsAt = Date.parse(effectiveUntil);
    if (Number.isFinite(endsAt) && endsAt <= now) return false;
  }
  return true;
}

export default async function KspIncPage() {
  const ctx = await requireSession();
  if (!isExecutive(ctx)) redirect('/home');

  const supabase = await getServerSupabase();
  if (!supabase) redirect('/home');

  const [members, unitResult, projectResult, clientResult, unitMembershipResult] = await Promise.all([
    getMembersAdmin(supabase),
    supabase.from('business_units').select('id, status'),
    supabase.from('projects').select('id, business_unit_id'),
    supabase.from('client_organizations').select('id, status'),
    supabase
      .from('business_unit_memberships')
      .select('profile_id, effective_from, effective_until, suspended_at')
  ]);

  const owners = members.filter((member) => OWNER_ROLES.has(member.role));
  const activeUnitMemberships = ((unitMembershipResult.data ?? []) as Array<{
    profile_id: string;
    effective_from: string | null;
    effective_until: string | null;
    suspended_at: string | null;
  }>).filter((membership) =>
    isActiveWindow(membership.effective_from, membership.effective_until, membership.suspended_at)
  );
  const unitMembershipCount = new Map<string, number>();
  for (const membership of activeUnitMemberships) {
    unitMembershipCount.set(membership.profile_id, (unitMembershipCount.get(membership.profile_id) ?? 0) + 1);
  }

  const activeUnits = unitResult.error
    ? null
    : ((unitResult.data ?? []) as Array<{ id: string; status: string }>).filter((unit) => unit.status === 'active').length;
  const projectCount = projectResult.error ? null : (projectResult.data ?? []).length;
  const unclassifiedProjects = projectResult.error
    ? null
    : ((projectResult.data ?? []) as Array<{ id: string; business_unit_id: string | null }>).filter(
        (project) => !project.business_unit_id
      ).length;
  const activeClients = clientResult.error
    ? null
    : ((clientResult.data ?? []) as Array<{ id: string; status: string }>).filter((client) => client.status === 'active').length;

  const metrics = [
    { label: 'Global owners', value: owners.length.toString(), detail: 'full KSP scope' },
    { label: 'Internal people', value: members.length.toString(), detail: 'role governed' },
    { label: 'Operating divisions', value: activeUnits === null ? '—' : activeUnits.toString(), detail: 'active' },
    { label: 'Projects', value: projectCount === null ? '—' : projectCount.toString(), detail: 'across KSP' },
    { label: 'Active clients', value: activeClients === null ? '—' : activeClients.toString(), detail: 'Portal boundary' },
    {
      label: 'Unclassified projects',
      value: unclassifiedProjects === null ? '—' : unclassifiedProjects.toString(),
      detail: unclassifiedProjects === 0 ? 'classification complete' : 'needs owner review'
    }
  ];

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Owner headquarters"
        title="KSP INC"
        description="The owner layer above every KSP operating app. Global visibility and control for the KSP owner tier; everyone else remains scoped by role, division, project and action."
      />

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="border-b border-line bg-ksp-carbon px-4 py-5 text-white sm:px-6">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/55">Root authority</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Owners see the whole system.</h2>
              <p className="mt-1 max-w-3xl text-[12px] leading-5 text-white/65">
                KSP INC is not another operating division. It is the control plane above Command, Portal, Network and every current or future KSP app.
              </p>
            </div>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10.5px] font-semibold text-white/75">
              Global owner scope
            </span>
          </div>
        </div>

        <div className="grid gap-px bg-line md:grid-cols-2">
          {owners.length > 0 ? (
            owners.map((owner) => (
              <article key={owner.profileId} className="bg-surface p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink">{owner.displayName}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-3">{ROLE_LABELS[owner.role] ?? owner.role}</p>
                  </div>
                  <span className="rounded-full border border-brand/20 bg-brand-tint px-2.5 py-1 text-[10px] font-semibold text-brand">
                    Owner
                  </span>
                </div>
                <p className="mt-3 text-[11.5px] leading-5 text-ink-3">
                  Full cross-app and cross-division KSP operating scope. No business-unit membership is required for owner visibility.
                </p>
              </article>
            ))
          ) : (
            <div className="bg-surface p-5 text-[12px] text-ink-3 md:col-span-2">
              Owner memberships could not be loaded. Access remains enforced by the authenticated executive-role gate.
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-line bg-surface px-3 py-3 shadow-card">
            <p className="tnum text-[20px] font-semibold tracking-[-0.03em] text-ink">{metric.value}</p>
            <p className="mt-0.5 text-[10.5px] font-semibold text-ink-2">{metric.label}</p>
            <p className="mt-0.5 text-[10px] text-ink-4">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section>
        <div className="mb-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-4">Apps</p>
          <h2 className="mt-1 text-[17px] font-semibold text-ink">One owner layer, separate operating surfaces</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {apps.map((app) => (
            <article key={app.name} className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand">{app.audience}</p>
              <h3 className="mt-1.5 text-[15px] font-semibold text-ink">{app.name}</h3>
              <p className="mt-2 min-h-10 text-[11.5px] leading-5 text-ink-3">{app.description}</p>
              <Link href={app.manageHref} className="mt-4 inline-flex text-[11.5px] font-semibold text-brand hover:underline">
                {app.manageLabel} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-4">Owner controls</p>
          <h2 className="mt-1 text-[17px] font-semibold text-ink">Control from the top, without flattening permissions</h2>
          <p className="mt-1 max-w-3xl text-[11.5px] leading-5 text-ink-3">
            KSP INC centralizes the entry points. Each destination still re-checks authorization on the server and, where applicable, in database RLS.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {controls.map((control) => (
            <article key={control.title} className="rounded-xl border border-line bg-surface p-4 shadow-card">
              <h3 className="text-[13.5px] font-semibold text-ink">{control.title}</h3>
              <p className="mt-1.5 min-h-10 text-[11.5px] leading-5 text-ink-3">{control.description}</p>
              <Link href={control.href} className="mt-3 inline-flex text-[11px] font-semibold text-brand hover:underline">
                {control.label} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface shadow-card">
        <div className="border-b border-line p-4 sm:px-5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-4">Effective access</p>
          <h2 className="mt-1 text-[16px] font-semibold text-ink">Owner vs. scoped identities</h2>
          <p className="mt-1 text-[11.5px] leading-5 text-ink-3">
            Owners are global. Everyone else enters KSP through explicit scope and can be narrowed further by project and action permissions.
          </p>
        </div>
        <div className="divide-y divide-line">
          {members.map((member) => {
            const owner = OWNER_ROLES.has(member.role);
            const divisionCount = unitMembershipCount.get(member.profileId) ?? 0;
            return (
              <div key={member.profileId} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-ink">{member.displayName}</p>
                  <p className="mt-0.5 text-[10.5px] text-ink-4">{ROLE_LABELS[member.role] ?? member.role}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10.5px]">
                  {owner ? (
                    <span className="rounded-full border border-brand/20 bg-brand-tint px-2.5 py-1 font-semibold text-brand">All KSP</span>
                  ) : (
                    <>
                      <span className="rounded-full border border-line bg-surface-2 px-2.5 py-1 font-medium text-ink-3">
                        {divisionCount} division{divisionCount === 1 ? '' : 's'}
                      </span>
                      <span className="rounded-full border border-line bg-surface px-2.5 py-1 font-medium text-ink-4">Scoped</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {members.length === 0 ? <p className="p-5 text-[12px] text-ink-3">No internal identities were returned.</p> : null}
        </div>
        <div className="border-t border-line p-4 sm:px-5">
          <div className="flex flex-wrap gap-3">
            <Link href="/team" className="text-[11.5px] font-semibold text-brand hover:underline">Roles & suspension →</Link>
            <Link href="/divisions" className="text-[11.5px] font-semibold text-brand hover:underline">Division access →</Link>
            <Link href="/missions" className="text-[11.5px] font-semibold text-brand hover:underline">Project access →</Link>
          </div>
        </div>
      </section>

      <section id="platform" className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-4">Platform rule</p>
        <h2 className="mt-1 text-[15px] font-semibold text-ink">KSP INC is a control plane, not a bypass.</h2>
        <div className="mt-3 grid gap-2 text-[11.5px] leading-5 text-ink-3 md:grid-cols-2">
          <p className="rounded-xl bg-surface-2 px-3 py-2.5">Owner access comes from authenticated executive roles, never a name, email or client-side flag.</p>
          <p className="rounded-xl bg-surface-2 px-3 py-2.5">Non-owner access stays deny-by-default and is granted by division, project, resource and action.</p>
          <p className="rounded-xl bg-surface-2 px-3 py-2.5">Client Portal identities remain separate from internal KSP identities and cannot inherit internal division access.</p>
          <p className="rounded-xl bg-surface-2 px-3 py-2.5">Future KSP apps must inherit the same owner tier and scoped authorization contract before release.</p>
        </div>
      </section>
    </div>
  );
}
