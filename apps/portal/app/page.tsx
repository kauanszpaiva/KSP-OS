import Link from 'next/link';
import { Reveal } from '@ksp/ui';

const portalSections = [
  'Published project updates',
  'Client requests and status tracking',
  'Approvals and change orders',
  'Secure files and deliverables',
  'Billing, hosted payments, and receipts',
  'Support and structured feedback'
];

export default function PortalHome() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <Reveal className="flex items-start justify-between gap-6 border-b border-line pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">KSP Client Portal</p>
          <h1 className="mt-2 font-display text-[32px] font-semibold tracking-tight text-ink sm:text-[40px]">Invite-only client workspace</h1>
          <p className="mt-4 max-w-2xl text-[14px] text-ink-2">
            The portal exposes only client-safe, explicitly published records for authorized client organizations and
            granted projects. It does not render internal Command OS navigation.
          </p>
        </div>
        <Link
          href="/login"
          className="shrink-0 rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast active:scale-[0.98] hover:bg-brand-strong"
        >
          Client sign in
        </Link>
      </Reveal>
      <Reveal delay={60} className="mt-8 grid gap-4 md:grid-cols-2">
        {portalSections.map((section) => (
          <article key={section} className="rounded-xl border border-line bg-surface p-5 shadow-card">
            <h2 className="text-[15px] font-semibold text-ink">{section}</h2>
            <p className="mt-2 text-[13px] text-ink-3">
              Portal capability is governed by invitation, client membership, project grants, publication state, and RLS.
            </p>
          </article>
        ))}
      </Reveal>
    </main>
  );
}
