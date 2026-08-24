export default function NetworkSetup() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md rounded-xl border border-line bg-surface p-7 shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">KSP Network</p>
        <h1 className="mt-2 text-xl font-semibold text-ink">Configuration required</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          This KSP Network deployment does not have the public Supabase configuration required to authenticate partner sessions.
        </p>
      </div>
    </main>
  );
}
