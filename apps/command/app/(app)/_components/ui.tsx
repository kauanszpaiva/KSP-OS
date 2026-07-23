import type { ReactNode } from 'react';
import { Icon, type IconName } from '@ksp/ui';

/* ---------------------------------------------------------------- layout -- */

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">{eyebrow}</p>
        <h1 className="mt-1.5 text-[26px] font-semibold leading-tight text-ink">{title}</h1>
        {description && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {action}
    </div>
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
  return <Tag className={`rounded-xl border border-line bg-surface shadow-card ${className}`}>{children}</Tag>;
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{children}</h2>
      {right}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon?: IconName; title: string; hint?: string }) {
  return (
    <div className="animate-fade-in rounded-xl border border-dashed border-line-2 bg-surface/50 px-5 py-8 text-center">
      {icon && (
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-ink-3">
          <Icon name={icon} className="h-5 w-5" />
        </span>
      )}
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-[13px] text-ink-3">{hint}</p>}
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
        <span
          key={i}
          className={`h-1.5 w-8 rounded-full ${i < filled ? 'bg-brand' : 'border border-dashed border-line-2 bg-transparent'}`}
        />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- status -- */

type Tone = 'neutral' | 'brand' | 'good' | 'warn' | 'risk';

const STATE_TONE: Record<string, Tone> = {
  open: 'neutral',
  in_progress: 'brand',
  blocked: 'risk',
  proof_submitted: 'warn',
  completed: 'good',
  rejected: 'risk',
  active: 'good',
  paused: 'warn',
  replaced: 'neutral',
  archived: 'neutral',
  draft: 'neutral',
  pending_approval: 'warn',
  approved: 'good',
  posted: 'good',
  locked: 'neutral',
  quarantined: 'risk',
  unknown: 'neutral',
  on_track: 'good',
  at_risk: 'warn',
  off_track: 'risk',
  done: 'good',
  pending: 'neutral',
  healthy: 'good',
  watch: 'warn',
  idea: 'neutral',
  drafting: 'neutral',
  internal_review: 'warn',
  client_review: 'warn',
  scheduled: 'brand',
  published: 'good'
};

const TONE_CLASS: Record<Tone, { dot: string; text: string }> = {
  neutral: { dot: 'bg-ink-4', text: 'text-ink-3' },
  brand: { dot: 'bg-brand', text: 'text-brand' },
  good: { dot: 'bg-good', text: 'text-good' },
  warn: { dot: 'bg-warn', text: 'text-warn' },
  risk: { dot: 'bg-risk', text: 'text-risk' }
};

/** Same state→tone mapping StatePill uses, for callers that need just the color (e.g. a Gantt marker dot). */
export function stateToneDotClass(state: string): string {
  return TONE_CLASS[STATE_TONE[state] ?? 'neutral'].dot;
}

export function StatePill({ state }: { state: string }) {
  const tone = STATE_TONE[state] ?? 'neutral';
  const cls = TONE_CLASS[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium capitalize ${cls.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cls.dot}`} />
      {state.replace(/_/g, ' ')}
    </span>
  );
}

/** Inline figure — label above a tabular value, optional tone. */
export function Figure({ label, value, tone = 'neutral', suffix }: { label: string; value: number | string; tone?: Tone; suffix?: string }) {
  const color = tone === 'risk' ? 'text-risk' : tone === 'warn' ? 'text-warn' : tone === 'good' ? 'text-good' : 'text-ink';
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{label}</p>
      <p className={`tnum mt-0.5 text-2xl font-semibold ${color}`}>
        {value}
        {suffix && <span className="ml-0.5 text-sm font-normal text-ink-3">{suffix}</span>}
      </p>
    </div>
  );
}
