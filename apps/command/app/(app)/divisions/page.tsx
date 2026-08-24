import { redirect } from 'next/navigation';
import { isExecutive } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getMembersAdmin } from '../data';
import { PageHeader } from '../_components/ui';
import {
  CreateDivisionForm,
  GrantDivisionAccessForm,
  ProjectDivisionForm,
  RevokeDivisionAccessForm
} from './_components/division-forms';

interface UnitRow {
  id: string;
  key: string;
  name: string;
  focus: string | null;
  status: string;
}

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  business_unit_id: string | null;
}

interface UnitMembershipRow {
  business_unit_id: string;
  profile_id: string;
  access_level: string;
  suspended_at: string | null;
  effective_until: string | null;
}

const roleLabels: Record<string, string> = {
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

export default async function DivisionsPage() {
  const ctx = await requireSession();
  if (!isExecutive(ctx)) redirect('/home');

  const supabase = await getServerSupabase();
  if (!supabase) redirect('/home');

  const [{ data: unitData }, { data: projectData }, { data: membershipData }, members] = await Promise.all([
    supabase
      .from('business_units')
      .select('id, key, name, focus, status')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('projects')
      .select('id, name, status, business_unit_id')
      .order('created_at', { ascending: false }),
    supabase
      .from('business_unit_memberships')
      .select('business_unit_id, profile_id, access_level, suspended_at, effective_until'),
    getMembersAdmin(supabase)
  ]);

  const units = (unitData ?? []) as UnitRow[];
  const projects = (projectData ?? []) as ProjectRow[];
  const now = Date.now();
  const memberships = ((membershipData ?? []) as UnitMembershipRow[]).filter((membership) => {
    if (membership.suspended_at) return false;
    if (!membership.effective_until) return true;
    const expiresAt = Date.parse(membership.effective_until);
    return Number.isFinite(expiresAt) && expiresAt > now;
  });
  const activeUnits = units.filter((unit) => unit.status === 'active');
  const unitNameById = new Map(activeUnits.map((unit) => [unit.id, unit.name]));
  const unclassifiedCount = projects.filter((project) => !project.business_unit_id).length;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Control"
        title="KSP Structure"
        description="One KSP OS, multiple operating divisions. Owners retain global control; everyone else is scoped by division, project and permission."
      />

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">Owner layer</p>
            <h2 className="mt-1 text-[16px] font-semibold text-ink">Global KSP OS control</h2>
            <p className="mt-1 max-w-3xl text-[12px] leading-5 text-ink-3">
              Founder & CEO and Executive Operations remain global owners. They do not need a division membership to see or administer any KSP arm.
            </p>
          </div>
          <span className="rounded-full border border-brand/20 bg-brand-tint px-3 py-1 text-[11px] font-semibold text-brand">All divisions</span>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">Operating arms</p>
          <h2 className="mt-1 text-[17px] font-semibold text-ink">Business divisions</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeUnits.map((unit) => {
            const projectCount = projects.filter((project) => project.business_unit_id === unit.id).length;
            const memberCount = memberships.filter((membership) => membership.business_unit_id === unit.id).length;
            return (
              <article key={unit.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[15px] font-semibold text-ink">{unit.name}</h3>
                  <code className="rounded bg-surface-2 px-2 py-1 text-[10px] text-ink-4">{unit.key}</code>
                </div>
                <p className="mt-2 min-h-10 text-[12px] leading-5 text-ink-3">{unit.focus || 'No focus statement yet.'}</p>
                <div className="mt-4 flex gap-4 border-t border-line pt-3 text-[11px] text-ink-3">
                  <span><strong className="text-ink">{projectCount}</strong> projects</span>
                  <span><strong className="text-ink">{memberCount}</strong> scoped members</span>
                </div>
              </article>
            );
          })}
        </div>

        <details className="overflow-hidden rounded-xl border border-dashed border-line-2 bg-surface-2/25">
          <summary className="cursor-pointer list-none px-4 py-3 text-[12px] font-semibold text-brand marker:hidden [&::-webkit-details-marker]:hidden">
            + Create a future KSP division
          </summary>
          <div className="border-t border-line p-4"><CreateDivisionForm /></div>
        </details>
      </section>

      <section className="rounded-2xl border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">Migration</p>
            <h2 className="mt-1 text-[16px] font-semibold text-ink">Classify existing projects</h2>
            <p className="mt-1 text-[12px] text-ink-3">Legacy projects remain visible until classified so the rollout cannot silently remove current access.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${unclassifiedCount ? 'bg-warn/10 text-warn' : 'bg-success/10 text-success'}`}>
            {unclassifiedCount} unclassified
          </span>
        </div>
        <div className="divide-y divide-line">
          {projects.map((project) => (
            <div key={project.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,0.9fr)] sm:items-center sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-ink">{project.name}</p>
                <p className="mt-0.5 text-[10.5px] uppercase tracking-wide text-ink-4">{project.status} · {project.business_unit_id ? unitNameById.get(project.business_unit_id) ?? 'Unknown division' : 'Legacy / unclassified'}</p>
              </div>
              <ProjectDivisionForm projectId={project.id} currentBusinessUnitId={project.business_unit_id} units={activeUnits} />
            </div>
          ))}
          {projects.length === 0 ? <p className="p-5 text-[12px] text-ink-3">No projects to classify.</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface shadow-card">
        <div className="border-b border-line p-4 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">Access</p>
          <h2 className="mt-1 text-[16px] font-semibold text-ink">Team by division</h2>
          <p className="mt-1 text-[12px] text-ink-3">Division membership controls which operating arm a non-owner can enter. Project membership and fine-grained grants still control what they can do inside it.</p>
        </div>
        <div className="divide-y divide-line">
          {members.map((member) => {
            const globalOwner = member.role === 'founder_ceo' || member.role === 'executive_operations';
            const memberUnits = memberships.filter((membership) => membership.profile_id === member.profileId);
            return (
              <div key={member.profileId} className="grid gap-3 p-4 lg:grid-cols-[minmax(12rem,0.7fr)_minmax(0,1.3fr)] lg:items-start sm:px-5">
                <div>
                  <p className="text-[13px] font-semibold text-ink">{member.displayName}</p>
                  <p className="mt-0.5 text-[11px] text-ink-4">{roleLabels[member.role] ?? member.role}</p>
                  {member.email ? <p className="mt-0.5 truncate text-[10.5px] text-ink-4">{member.email}</p> : null}
                </div>
                {globalOwner ? (
                  <div className="rounded-xl border border-brand/15 bg-brand-tint/60 px-3 py-2.5 text-[12px] text-brand">
                    Global owner — full access across current and future KSP divisions.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {memberUnits.length === 0 ? <span className="text-[11px] text-ink-4">No division access yet.</span> : null}
                      {memberUnits.map((membership) => (
                        <div key={membership.business_unit_id} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5">
                          <span className="text-[11px] font-medium text-ink-2">{unitNameById.get(membership.business_unit_id) ?? 'Unknown'} · {membership.access_level}</span>
                          <RevokeDivisionAccessForm profileId={member.profileId} businessUnitId={membership.business_unit_id} />
                        </div>
                      ))}
                    </div>
                    <GrantDivisionAccessForm profileId={member.profileId} units={activeUnits} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface-2/40 px-4 py-3 text-[11px] leading-5 text-ink-3">
        Client Portal access stays separate from internal KSP divisions: client organization + explicit project/publication access remains the client boundary.
      </section>
    </div>
  );
}
