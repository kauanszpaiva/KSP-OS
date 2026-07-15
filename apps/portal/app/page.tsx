const portalSections = [
  'Published project updates',
  'Client requests and status tracking',
  'Approvals and change orders',
  'Secure files and deliverables',
  'Billing, hosted payments, and receipts',
  'Support and structured feedback',
];

export default function PortalHome() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="border-b pb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-blue-900">KSP Client Portal</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Invite-only client workspace</h1>
        <p className="mt-4 max-w-3xl text-slate-600">
          The portal exposes only client-safe, explicitly published records for authorized client organizations and granted projects. It does not render internal Command OS navigation.
        </p>
      </header>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {portalSections.map((section) => (
          <article key={section} className="rounded-lg border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">{section}</h2>
            <p className="mt-2 text-sm text-slate-600">Portal capability is governed by invitation, client membership, project grants, publication state, and RLS.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
