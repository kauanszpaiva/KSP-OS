import Link from 'next/link';
import { Icon, Reveal, ThemeToggle } from '@ksp/ui';

const portalCapabilities = [
  {
    icon: 'products',
    label: 'Projects',
    detail: 'Progress, milestones, and updates published for your team.'
  },
  {
    icon: 'commitments',
    label: 'Approvals',
    detail: 'Review decisions, requests, and change orders when action is needed.'
  },
  {
    icon: 'vault',
    label: 'Files',
    detail: 'Documents, deliverables, and shared records in one secure place.'
  },
  {
    icon: 'finance',
    label: 'Billing',
    detail: 'Invoices, hosted payments, receipts, and account history.'
  },
  {
    icon: 'inbox',
    label: 'Requests',
    detail: 'Structured questions, feedback, and status tracking without email clutter.'
  },
  {
    icon: 'schedule',
    label: 'Meetings',
    detail: 'Keep important project conversations and follow-ups easy to find.'
  }
] as const;

const accessPoints = ['Invitation-only access', 'Permission-aware workspace', 'Client-safe project visibility'];

function BrandMark() {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand shadow-card">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path
            d="M6 3v18M6 12l7-9M6 12l7 9"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 8l-3.5 4L14 16"
            stroke="rgb(var(--accent))"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-bold leading-none tracking-tight text-ink">KSP Dominion Group</span>
        <span className="mt-1 block text-[10px] font-semibold uppercase leading-none tracking-[0.18em] text-ink-4">
          Client Portal
        </span>
      </span>
    </span>
  );
}

export default function PortalHome() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-canvas text-ink">
      <header className="relative z-20 border-b border-line bg-canvas/95 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/90">
        <div className="mx-auto flex h-[72px] w-full max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <BrandMark />
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-[13px] font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast hover:bg-brand-strong active:scale-[0.98] sm:px-5"
            >
              Sign in
              <Icon name="chevron-right" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto grid w-full max-w-[1240px] items-center gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:min-h-[650px] lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:px-8 lg:py-20">
        <Reveal className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 shadow-card">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-3">Private client workspace</span>
          </div>

          <h1 className="mt-6 max-w-[720px] font-display text-[42px] font-semibold leading-[0.98] tracking-[-0.04em] text-ink sm:text-[56px] lg:text-[68px]">
            Your project,
            <span className="block text-brand">clearly organized.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[16px] leading-7 text-ink-2 sm:text-[17px]">
            Review what changed, approve what needs you, find every file and invoice, and track every request without digging through email threads.
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-[14px] font-semibold text-on-brand shadow-card transition-[background-color,transform] duration-fast hover:bg-brand-strong active:scale-[0.98]"
            >
              Enter client portal
              <Icon name="chevron-right" className="h-[18px] w-[18px]" />
            </Link>
            <p className="px-1 text-[12px] leading-5 text-ink-3 sm:max-w-[235px]">
              New here? Use the secure invitation link sent to your email to activate access.
            </p>
          </div>

          <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5">
            {accessPoints.map((point) => (
              <span key={point} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-3">
                <Icon name="check" className="h-3.5 w-3.5 text-good" />
                {point}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={80} className="relative z-10 mx-auto w-full max-w-[560px] lg:mx-0 lg:ml-auto">
          <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-[32px] border border-brand/10" aria-hidden />
          <div className="absolute -right-8 -top-8 h-52 w-52 rounded-full border border-line" aria-hidden />

          <div className="relative overflow-hidden rounded-[28px] border border-line-2 bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">Workspace preview</p>
                <p className="mt-1 text-[15px] font-semibold text-ink">Everything important, one level away</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-tint text-brand">
                <Icon name="workspace" className="h-[18px] w-[18px]" />
              </span>
            </div>

            <div className="p-4 sm:p-5">
              <div className="rounded-2xl bg-surface-2 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">Project activity</p>
                    <p className="mt-2 text-[18px] font-semibold tracking-tight text-ink">See the latest before you act.</p>
                  </div>
                  <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-good-tint px-2.5 py-1 text-[10px] font-semibold text-good">
                    <span className="h-1.5 w-1.5 rounded-full bg-good" />
                    Published
                  </span>
                </div>

                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full w-2/3 rounded-full bg-brand" />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-ink-4">
                  <span>Updates</span>
                  <span>Decisions</span>
                  <span>Delivery</span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {portalCapabilities.slice(0, 4).map((item) => (
                  <div key={item.label} className="group rounded-2xl border border-line bg-canvas/60 p-4 transition-colors duration-fast hover:bg-surface-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-tint text-brand">
                        <Icon name={item.icon} className="h-[18px] w-[18px]" />
                      </span>
                      <Icon name="chevron-right" className="h-4 w-4 text-ink-4 transition-transform duration-fast group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-4 text-[13px] font-semibold text-ink">{item.label}</p>
                    <p className="mt-1 text-[11px] leading-4 text-ink-3">{item.detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-accent-strong">
                  <Icon name="vault" className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-ink">Your workspace only shows what your access allows.</p>
                  <p className="mt-0.5 text-[10.5px] leading-4 text-ink-3">Organization and project permissions shape the experience after sign in.</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid w-full max-w-[1240px] divide-y divide-line px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-8">
          <div className="py-7 md:pr-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">01 · Understand</p>
            <h2 className="mt-2 text-[17px] font-semibold text-ink">See what changed.</h2>
            <p className="mt-1.5 max-w-sm text-[12px] leading-5 text-ink-3">Published updates keep the project story clear without exposing internal noise.</p>
          </div>
          <div className="py-7 md:px-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">02 · Decide</p>
            <h2 className="mt-2 text-[17px] font-semibold text-ink">Act only when needed.</h2>
            <p className="mt-1.5 max-w-sm text-[12px] leading-5 text-ink-3">Approvals, requests, and billing surface the next client action with context.</p>
          </div>
          <div className="py-7 md:pl-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">03 · Keep record</p>
            <h2 className="mt-2 text-[17px] font-semibold text-ink">Find it later.</h2>
            <p className="mt-1.5 max-w-sm text-[12px] leading-5 text-ink-3">Files, receipts, decisions, and project communication stay attached to the work.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-4 py-10 sm:px-6 lg:px-8">
        <Reveal delay={120}>
          <div className="flex flex-col gap-6 rounded-[24px] border border-line bg-surface p-5 shadow-card sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">Built around your access</p>
              <h2 className="mt-2 font-display text-[24px] font-semibold tracking-tight text-ink sm:text-[28px]">A client portal should feel simple because the complexity stays behind it.</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:w-[470px]">
              {portalCapabilities.slice(4).map((item) => (
                <div key={item.label} className="flex items-start gap-3 rounded-xl bg-surface-2 p-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand">
                    <Icon name={item.icon} className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold text-ink">{item.label}</p>
                    <p className="mt-0.5 text-[10.5px] leading-4 text-ink-3">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-2 px-4 py-6 text-[11px] text-ink-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© KSP Dominion Group</span>
          <span>Private client portal · Access by invitation</span>
        </div>
      </footer>
    </main>
  );
}
