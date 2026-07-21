export const dynamic = 'force-dynamic';

export default function SetupPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wider text-ksp-blue">KSP Dominion OS</p>
      <h1 className="mt-2 text-2xl font-semibold text-ksp-navy">Environment not configured</h1>
      <p className="mt-3 text-slate-600">
        This deployment has no Supabase connection. Set the following environment variables, then reload:
      </p>
      <ul className="mt-4 space-y-1 rounded-md bg-ksp-mist p-4 font-mono text-sm text-slate-700">
        <li>NEXT_PUBLIC_SUPABASE_URL</li>
        <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
        <li>SUPABASE_SERVER_ONLY_SERVICE_KEY (server only)</li>
      </ul>
      <p className="mt-4 text-sm text-slate-500">See docs/runbooks/KSP_OS_LOCAL_SETUP.md for the full procedure.</p>
    </main>
  );
}
