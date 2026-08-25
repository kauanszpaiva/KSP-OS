import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isKspIncOwner } from '@ksp/auth';
import { requireSession } from '../../../../lib/session';
import { getServerSupabase } from '../../../../lib/supabase';
import { PageHeader } from '../../_components/ui';
import { AccessManager } from './_components/access-manager';
import { getAccessDirectoryData } from './data';

export default async function KspIncAccessPage() {
  const ctx = await requireSession();
  if (!isKspIncOwner(ctx)) redirect('/home');

  const supabase = await getServerSupabase();
  const data = supabase
    ? await getAccessDirectoryData(supabase)
    : { people: [], businessUnits: [], projects: [], partnerOrganizations: [], temporaryGrantMutationBlocked: true };

  const ownerCount = data.people.filter((person) => person.surfaces.inc).length;
  const commandCount = data.people.filter((person) => person.surfaces.command).length;
  const portalCount = data.people.filter((person) => person.surfaces.portal).length;
  const networkCount = data.people.filter((person) => person.surfaces.network).length;

  const stats = [
    ['KSP INC owners', ownerCount, 'Global company control'],
    ['Command identities', commandCount, 'Internal operating access'],
    ['Portal identities', portalCount, 'Client-scoped access'],
    ['Network identities', networkCount, 'Partner-scoped access']
  ] as const;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          eyebrow="KSP INC · owner plane"
          title="Access Directory"
          description="See who can enter each KSP OS surface, why they have access, and which scoped grants produce that authority. Owner mutations require MFA and remain backed by server authorization plus database policy."
        />
        <Link href="/inc" className="rounded-lg border border-line bg-surface px-3 py-2 text-[10.5px] font-semibold text-ink-2 hover:border-brand hover:text-brand">← Owner Plane</Link>
      </div>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, note]) => (
          <div key={label} className="rounded-xl border border-line bg-surface px-3.5 py-3 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">{label}</p>
              <span className="tnum text-[18px] font-semibold text-ink">{value}</span>
            </div>
            <p className="mt-2 text-[10.5px] text-ink-3">{note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <div className="rounded-xl border border-brand/20 bg-brand-tint/40 px-4 py-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-brand">Owner contract</p>
          <p className="mt-1.5 text-[12px] font-semibold text-ink">KSP INC sees the control plane. Other identities see only the scopes they need.</p>
          <p className="mt-1.5 text-[10.5px] leading-4 text-ink-3">Kauan and Vanessa are represented by authenticated owner roles, never by hardcoded email or name checks. Founder OS/Vault remains a separate founder-only private boundary.</p>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-4">Control shortcuts</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10.5px] font-semibold">
            <Link href="/team" className="rounded-md bg-surface-2 px-2.5 py-2 text-ink-2 hover:text-brand">Roles & status →</Link>
            <Link href="/divisions" className="rounded-md bg-surface-2 px-2.5 py-2 text-ink-2 hover:text-brand">Divisions →</Link>
            <Link href="/clients" className="rounded-md bg-surface-2 px-2.5 py-2 text-ink-2 hover:text-brand">Portal →</Link>
            <Link href="/control-center" className="rounded-md bg-surface-2 px-2.5 py-2 text-ink-2 hover:text-brand">Audit & platform →</Link>
          </div>
        </div>
      </section>

      <AccessManager data={data} mfa={ctx.mfa} />

      <section className="rounded-xl border border-line bg-surface-2/45 px-4 py-3 text-[10.5px] leading-4 text-ink-3">
        <strong className="font-semibold text-ink-2">Security note:</strong> this page does not create a second authorization system. Internal grants use <code>internal_permission_grants</code>, Portal visibility continues through client memberships and project access grants, and Network access continues through partner memberships. Temporary grants stay read-only here until their RLS is narrowed in a reviewed migration.
      </section>
    </div>
  );
}
