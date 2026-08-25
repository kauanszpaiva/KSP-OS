'use client';

export default function CommandError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;

  return (
    <section role="alert" aria-labelledby="command-error-title" className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-7">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">KSP OS · Command</p>
      <h1 id="command-error-title" className="mt-2 text-xl font-semibold text-ink sm:text-2xl">This view could not be loaded.</h1>
      <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-3 sm:text-sm">
        Your action was not confirmed from this screen. Retry the view before repeating any operation.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-ksp-signal px-4 text-[13px] font-semibold text-ksp-carbon transition-[transform,filter] duration-fast hover:brightness-95 active:scale-[0.98] sm:min-h-9"
        >
          Try again
        </button>
        <a
          href="/home"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface px-4 text-[13px] font-medium text-ink-2 transition-colors duration-fast hover:bg-surface-2 hover:text-ink sm:min-h-9"
        >
          Go to Home
        </a>
      </div>
    </section>
  );
}
