import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isKspIncOwner } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { PageHeader } from '../_components/ui';

const surfaces = [
  {
    name: 'KSP INC',
    audience: 'Owners',
    role: 'Owner plane',
    description: 'Cross-company visibility, access governance, approvals, audit, platform health and control over every KSP operating surface.',
    boundary: 'Global owner roles only',
    href: '/inc/access',
    action: 'Open access directory',
    external: false
  },
  {
    name: 'Command',
    audience: 'KSP internal team',
    role: 'Operations',
    description: 'Projects, execution, team, delivery, finance, content, software and day-to-day internal operations.',
    boundary: 'Business unit + project + permission scope',
    href: '/home',
    action: 'Open Command',
    external: false
  },
  {
    name: 'Portal',
    audience: 'Clients',
    role: 'Client experience',
    description: 'Client-safe projects, publications, requests, approvals, deliverables, invoices and account access without exposing internal KSP operations.',
    boundary: 'Client organization + project/resource grants',
    href: 'https://kspdominionportal.com',
    action: 'Open Client Portal',
    external: true
  },
  {
    name: 'Network',
    audience: 'Subcontractors & partners',
    role: 'Partner operations',
    description: 'Assignments, project handoffs, required materials and partner collaboration without broad KSP or client visibility.',
    boundary: 'Partner organization + assignment scope',
    href: '/inc/access',
    action: 'Manage Network access',
    external: false
  }
] as const;

const ownerControls = [
  {
    title: 'Access directory',
    description: 'See every identity across INC, Command, Portal and Network, understand why access exists, and manage audited grants from one owner workspace.',
    href: '/inc/access'
  },
  {
    title: 'Structure & access',
    description: 'Create operating divisions, classify projects and grant or revoke scoped internal access.',
    href: '/divisions'
  },
  {
    title: 'People',
    description: 'Review internal identities, roles and project-level access before granting broader permissions.',
    href: '/team'
  },
  {
    title: 'Clients',
    description: 'Control client organizations, Portal identities and client-safe project access.',
    href: '/clients'
  },
  {
    title: 'Finance & approvals',
    description: 'Keep restricted financial operations behind the executive authorization boundary.',
    href: '/finance'
  },
  {
    title: 'Platform & audit',
    description: 'Inspect platform readiness, release gates, Network administration status and privileged-control gaps.',
    href: '/control-center'
  }
] as const;

export default async function KspIncPage() {
  const ctx = await requireSession();
  if (!isKspIncOwner(ctx)) redirect('/home');

  return (
    <div className="min-w-0 space-y-7">
      <PageHeader
        eyebrow="Owner plane"
        title="KSP INC"
        description="The control layer above KSP OS. Owners can govern Command, Portal and Network from one place while each audience remains isolated by server authorization and database policy."
      />

      <section className="rounded-2xl border border-brand/20 bg-brand-tint/45 p-4 shadow-card sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:items-center">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-brand">Global ownership</p>
            <h2 className="mt-1.5 font-display text-[21px] font-semibold text-ink">One identity system. Four experiences. No duplicate authority.</h2>
            <p className="mt-2 max-w-3xl text-[12.5px] leading-5 text-ink-3">
              KSP INC ownership is role-based through the global executive boundary. Every non-owner remains deny-by-default and receives only the division, client, partner, project and action scopes explicitly granted to that identity.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface px-4 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-4">Owner roles</p>
            <p className="mt-1 text-[13px] font-semibold text-ink">Founder & CEO · Executive Operations</p>
            <p className="mt-1 text-[11.5px] leading-5 text-ink-3">Founder OS remains a separate founder-only private workspace and is not inherited by the second global owner.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-4">System map</p>
          <h2 className="mt-1 text-[17px] font-semibold text-ink">Who each KSP OS surface is for</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {surfaces.map((surface) => {
            const className = surface.name === 'KSP INC'
              ? 'border-brand/25 bg-brand-tint/30'
              : 'border-line bg-surface';
            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-4">{surface.role}</p>
                    <h3 className="mt-1 text-[16px] font-semibold text-ink">{surface.name}</h3>
                  </div>
                  <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold text-ink-3">{surface.audience}</span>
                </div>
                <p className="mt-3 text-[12px] leading-5 text-ink-3">{surface.description}</p>
                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">Access boundary</p>
                  <p className="mt-1 text-[11.5px] font-medium leading-5 text-ink-2">{surface.boundary}</p>
                  <p className="mt-3 text-[11.5px] font-semibold text-brand">{surface.action} →</p>
                </div>
              </>
            );

            return surface.external ? (
              <a
                key={surface.name}
                href={surface.href}
                target="_blank"
                rel="noreferrer"
                className={`rounded-2xl border p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${className}`}
              >
                {content}
              </a>
            ) : (
              <Link
                key={surface.name}
                href={surface.href}
                className={`rounded-2xl border p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${className}`}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-4">Owner controls</p>
          <h2 className="mt-1 text-[17px] font-semibold text-ink">Govern the company without entering every workspace</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ownerControls.map((control) => (
            <Link key={control.href} href={control.href} className="group rounded-xl border border-line bg-surface p-4 shadow-card transition hover:border-brand/25 hover:shadow-card-hover">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[13px] font-semibold text-ink">{control.title}</h3>
                <span className="text-[13px] text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-brand">→</span>
              </div>
              <p className="mt-2 text-[11.5px] leading-5 text-ink-3">{control.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface-2/45 p-4 text-[11.5px] leading-5 text-ink-3">
        <strong className="font-semibold text-ink-2">Security contract:</strong> hiding a page is not authorization. Owner, employee, client and partner boundaries must continue to be enforced by server checks and Supabase RLS. Sensitive owner mutations require auditable grants/revocations, and production database changes remain subject to the existing release gates.
      </section>
    </div>
  );
}
