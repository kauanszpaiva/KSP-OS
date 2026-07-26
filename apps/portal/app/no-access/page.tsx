export const dynamic = 'force-dynamic';

export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md animate-fade-slide-up">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-strong text-on-brand shadow-card">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
              <path d="M6 3v18M6 12l7-9M6 12l7 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 8l-3.5 4L14 16" stroke="rgb(var(--accent))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-ink">KSP</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Client Portal</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-7 shadow-card">
          <h1 className="font-display text-[22px] font-semibold text-ink">No active workspace</h1>
          <p className="mt-2 text-[14px] text-ink-2">
            You&rsquo;re signed in, but your account isn&rsquo;t linked to an active client workspace right now.
          </p>
          <p className="mt-3 text-[13px] text-ink-3">
            This usually means your invitation hasn&rsquo;t been set up yet, your access has expired, or it was
            temporarily suspended. Reach out to your KSP contact and they can restore or re-invite you.
          </p>

          <form action="/auth/signout" method="post" className="mt-6">
            <button
              type="submit"
              className="w-full rounded-lg border border-line-2 bg-surface px-4 py-2 text-sm font-semibold text-ink-2 transition-colors duration-fast hover:bg-surface-2"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
