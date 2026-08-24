import type { ReactNode } from 'react';
import { Icon, type IconName } from '@ksp/ui';

/* ---------------------------------------------------------------- layout -- */

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 border-b border-line pb-5 md:mb-6 md:flex md:items-end md:justify-between md:gap-6 md:pb-4">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && (
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-4 sm:mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[28px] font-semibold leading-[1.08] text-ink md:text-[30px]">{title}</h1>
        {description && (
          <details className="group mt-2 max-w-2xl text-ink-3">
            <summary className="inline-flex cursor-pointer select-none items-center gap-1.5 text-[12px] font-medium marker:hidden transition-colors duration-fast hover:text-ink [&::-webkit-details-marker]:hidden">
              About this page
              <Icon name="chevron-down" className="h-3.5 w-3.5 transition-transform duration-fast group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-[13.5px] leading-[1.5] md:text-[14px]">{description}</p>
          </details>
        )}
      </div>
      {action && <div className="mt-3 shrink-0 md:mt-0">{action}</div>}
    </header>
  );
}

export function Panel({
  children,
  className = '',
  as: Tag = 'section'
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article' | 'aside';
}) {
  return <Tag className={`min-w-0 rounded-2xl border border-line bg-surface shadow-card sm:rounded-xl ${className}`}>{children}</Tag>;
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2.5 flex min-h-6 min-w-0 items-center justify-between gap-3">
      <h2 className="min-w-0 text-[13px] font-semibold leading-tight text-ink-2 sm:text-[12.5px]">{children}</h2>
      {right && <div className="min-w-0 shrink-0 text-right">{right}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon?: IconName; title: string; hint?: string }) {
  return (
    <div className="animate-fade-in rounded-2xl border border-dashed border-line-2 bg-surface/60 px-4 py-8 text-center sm:rounded-xl sm:px-5 sm:py-8">
      {icon && (
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-ink-3">
          <Icon name={icon} className="h-5 w-5" />
        </span>
      )}
      <p className="text-[14px] font-medium text-ink-2">{title}</p>
      {hint && <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-ink-3 sm:text-[13px]">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------ data marks -- */

/** Horizontal magnitude rail — single hue, rounded fill end anchored at 0. */
export function Rail({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'good' | 'warn' | 'risk' }) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = tone === 'good' ? 'bg-good' : tone === 'warn' ? 'bg-warn' : tone === 'risk' ? 'bg-risk' : 'bg-brand';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" role="presentation">
      <div className={`h-full rounded-full transition-[width] duration-slow ease-standard ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Progress ring — single hue over a recessive track, tabular figure centered. */
export function Ring({ value, size = 68, stroke = 6 }: { value: number; size?: number; stroke?: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={`${pct}% complete`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-line" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className={pct >= 100 ? 'stroke-accent' : 'stroke-brand'}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset var(--motion-slow) var(--ease-standard)' }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="tnum fill-ink text-[15px] font-semibold">
        {pct}
      </text>
    </svg>
  );
}

/** Governor meter — n filled slots of a fixed total (the 3-outcome cap). */
export function SlotMeter({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`${filled} of ${total} slots active`}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`h-1.5 w-8 rounded-full ${i < filled ? 'bg-brand' : 'border border-dashed border-line-2 bg-transparent'}`} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- status -- */

type Tone = 'neutral' | 'brand' | 'good' | 'warn' | 'risk';

const STATE_TONE: Record<string, Tone> = {
  open: 'neutral', in_progress: 'brand', blocked: 'risk', proof_submitted: 'warn', completed: 'good', rejected: 'risk',
  active: 'good', paused: 'warn', replaced: 'neutral', archived: 'neutral', draft: 'neutral', pending_approval: 'warn', approved: 'good',
  posted: 'good', locked: 'neutral', quarantined: 'risk', unknown: 'neutral', on_track: 'good', at_risk: 'warn', off_track: 'risk', done: 'good',
  pending: 'neutral', healthy: 'good', watch: 'warn', idea: 'neutral', drafting: 'neutral', internal_review: 'warn', client_review: 'warn', scheduled: 'brand', published: 'good'
};

const TONE_CLASS: Record<Tone, { dot: string; text: string }> = {
  neutral: { dot: 'bg-ink-4', text: 'text-ink-3' },
  brand: { dot: 'bg-brand', text: 'text-brand' },
  good: { dot: 'bg-good', text: 'text-good' },
  warn: { dot: 'bg-warn', text: 'text-warn' },
  risk: { dot: 'bg-risk', text: 'text-risk' }
};

export function stateToneDotClass(state: string): string {
  return TONE_CLASS[STATE_TONE[state] ?? 'neutral'].dot;
}

export function StatePill({ state }: { state: string }) {
  const tone = STATE_TONE[state] ?? 'neutral';
  const cls = TONE_CLASS[tone];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 text-[11.5px] font-medium capitalize ${cls.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cls.dot}`} aria-hidden />
      {state.replace(/_/g, ' ')}
    </span>
  );
}

export function Figure({ label, value, tone = 'neutral', suffix }: { label: string; value: number | string; tone?: Tone; suffix?: string }) {
  const color = tone === 'risk' ? 'text-risk' : tone === 'warn' ? 'text-warn' : tone === 'good' ? 'text-good' : 'text-ink';
  return (
    <div className="min-w-0">
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-3 sm:text-[11px]">{label}</p>
      <p className={`tnum mt-1 text-[22px] font-semibold leading-none sm:text-2xl ${color}`}>
        {value}
        {suffix && <span className="ml-0.5 text-sm font-normal text-ink-3">{suffix}</span>}
      </p>
    </div>
  );
}
