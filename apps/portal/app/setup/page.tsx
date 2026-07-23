export const dynamic = 'force-dynamic';

export default function SetupPage() {
  return (
    <main className="mx-auto max-w-2xl animate-fade-slide-up px-6 py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">KSP Client Portal</p>
      <h1 className="mt-2 font-display text-[24px] font-semibold text-ink">Environment not configured</h1>
      <p className="mt-3 text-[14px] text-ink-2">
        This deployment has no Supabase connection. Set the following environment variables, then reload:
      </p>
      <ul className="mt-4 space-y-1 rounded-xl border border-line bg-surface p-4 font-mono text-[13px] text-ink-2">
        <li>NEXT_PUBLIC_SUPABASE_URL</li>
        <li>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
        <li>SUPABASE_SERVER_ONLY_SECRET_KEY (preferred) or SUPABASE_SERVER_ONLY_SERVICE_KEY (server only)</li>
      </ul>
      <p className="mt-4 text-[13px] text-ink-3">See docs/runbooks/KSP_OS_LOCAL_SETUP.md for the full procedure.</p>
    </main>
  );
}
