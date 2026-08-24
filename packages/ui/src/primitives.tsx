import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './icons';

/** Tiny classnames joiner — no dependency needed. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* --------------------------------------------------------------- Button -- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_BASE =
  'inline-flex select-none items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-[background-color,color,transform,box-shadow] duration-fast ease-standard focus-visible:outline-none focus-visible:shadow-focus active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-on-brand shadow-card hover:bg-brand-strong',
  secondary: 'border border-line-2 bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-risk text-white shadow-card hover:brightness-110'
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-9 px-4 text-[13px]',
  lg: 'h-11 px-5 text-sm'
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', icon, loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      type={props.type ?? 'button'}
      disabled={disabled || loading}
      className={cx(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size], className)}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  className,
  ...props
}: { icon: IconName; label: string; size?: 'sm' | 'md'; variant?: 'ghost' | 'secondary' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const look =
    variant === 'secondary'
      ? 'border border-line-2 bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink'
      : 'text-ink-3 hover:bg-surface-2 hover:text-ink';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex items-center justify-center rounded-lg transition-colors duration-fast focus-visible:outline-none focus-visible:shadow-focus',
        dim,
        look,
        className
      )}
      {...props}
    >
      <Icon name={icon} className={size === 'sm' ? 'h-[17px] w-[17px]' : 'h-[18px] w-[18px]'} />
    </button>
  );
}

/* ----------------------------------------------------------------- Card -- */

export function Card({
  children,
  className,
  interactive = false,
  as: Tag = 'div',
  ...props
}: { children: ReactNode; className?: string; interactive?: boolean; as?: 'div' | 'section' | 'article' | 'li' } & HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cx(
        'rounded-xl border border-line bg-surface shadow-card',
        interactive && 'transition-[transform,box-shadow,border-color] duration-fast ease-standard hover:-translate-y-0.5 hover:border-line-2 hover:shadow-pop',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/* ---------------------------------------------------------------- Badge -- */

export type Tone = 'neutral' | 'brand' | 'accent' | 'good' | 'warn' | 'risk';

const BADGE_TONE: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  brand: 'bg-brand-tint text-brand',
  accent: 'bg-accent-tint text-accent-strong',
  good: 'bg-good-tint text-good',
  warn: 'bg-warn-tint text-warn',
  risk: 'bg-risk-tint text-risk'
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium', BADGE_TONE[tone], className)}>
      {children}
    </span>
  );
}

export function Dot({ tone = 'neutral', className }: { tone?: Tone; className?: string }) {
  const map: Record<Tone, string> = {
    neutral: 'bg-ink-4',
    brand: 'bg-brand',
    accent: 'bg-accent',
    good: 'bg-good',
    warn: 'bg-warn',
    risk: 'bg-risk'
  };
  return <span className={cx('inline-block h-1.5 w-1.5 rounded-full', map[tone], className)} aria-hidden />;
}

/* ---------------------------------------------------------- Visual marks -- */

export type ShapeKind = 'circle' | 'square' | 'diamond' | 'triangle';

const MARK_TONE: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-ink-3',
  brand: 'bg-brand-tint text-brand',
  accent: 'bg-accent-tint text-accent-strong',
  good: 'bg-good-tint text-good',
  warn: 'bg-warn-tint text-warn',
  risk: 'bg-risk-tint text-risk'
};

const MARK_SIZE: Record<'sm' | 'md' | 'lg', { frame: string; icon: string }> = {
  sm: { frame: 'h-7 w-7', icon: 'h-3.5 w-3.5' },
  md: { frame: 'h-9 w-9', icon: 'h-[17px] w-[17px]' },
  lg: { frame: 'h-11 w-11', icon: 'h-5 w-5' }
};

/**
 * A redundant category cue: shape + icon + stable semantic tone. It keeps
 * dense operational views scannable without making color the only signal.
 */
export function ShapeMark({
  shape,
  icon,
  label,
  tone = 'brand',
  size = 'md',
  className
}: {
  shape: ShapeKind;
  icon: IconName;
  label: string;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dimensions = MARK_SIZE[size];
  const shapeClass =
    shape === 'circle'
      ? 'rounded-full'
      : shape === 'square'
        ? 'rounded-[10px]'
        : shape === 'diamond'
          ? 'rotate-45 rounded-[8px]'
          : '[clip-path:polygon(50%_3%,97%_91%,3%_91%)]';
  const iconClass = shape === 'diamond' ? '-rotate-45' : shape === 'triangle' ? 'translate-y-0.5' : '';

  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center', dimensions.frame, shapeClass, MARK_TONE[tone], className)}
      role="img"
      aria-label={label}
      title={label}
    >
      <Icon name={icon} className={cx(dimensions.icon, iconClass)} />
    </span>
  );
}

/* --------------------------------------------------------------- Avatar -- */

const AVATAR_HUES = ['bg-brand', 'bg-accent', 'bg-good', 'bg-warn', 'bg-risk'];

function hueFor(name: string): string {
  return AVATAR_HUES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_HUES.length];
}

function initialsFor(name: string): string {
  return (
    name
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

const AVATAR_DIM: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-8 w-8 text-[11px]',
  lg: 'h-10 w-10 text-[13px]'
};

/**
 * Deterministic initial avatar. A solid brand-family hue carries the color and
 * a top-left white sheen (`bg-gradient-to-br from-white/25`) plus a surface
 * ring give it depth and separate it cleanly when stacked.
 */
export function Avatar({ name, size = 'md', title }: { name: string; size?: 'sm' | 'md' | 'lg'; title?: string }) {
  const hue = hueFor(name);
  const onHue = hue === 'bg-accent' ? 'text-on-accent' : 'text-on-brand';
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/25 to-transparent font-semibold shadow-sm ring-2 ring-surface',
        AVATAR_DIM[size],
        hue,
        onHue
      )}
      title={title ?? name}
    >
      {initialsFor(name)}
    </span>
  );
}

/** Overlapping stack of avatars with a trailing "+N" when the list overflows. */
export function AvatarStack({ names, size = 'sm', max = 4 }: { names: string[]; size?: 'sm' | 'md' | 'lg'; max?: number }) {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length === 0) return null;
  const shown = unique.slice(0, max);
  const extra = unique.length - shown.length;
  return (
    <span className="inline-flex items-center -space-x-2">
      {shown.map((name, i) => (
        <span key={`${name}-${i}`} className="relative" style={{ zIndex: shown.length - i }}>
          <Avatar name={name} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className={cx(
            'inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-semibold text-ink-3 ring-2 ring-surface',
            AVATAR_DIM[size]
          )}
          title={unique.slice(max).join(', ')}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------ Skeleton / Spinner -- */

export function Skeleton({ className }: { className?: string }) {
  return <span className={cx('skeleton block rounded-md', className)} aria-hidden />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cx('animate-spin', className)} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------------------------------- ProgressBar -- */

const PROGRESS_FILL: Record<'brand' | 'accent' | 'good' | 'warn' | 'risk', string> = {
  brand: 'bg-brand',
  accent: 'bg-accent',
  good: 'bg-good',
  warn: 'bg-warn',
  risk: 'bg-risk'
};

/** Thin horizontal progress bar — a shared, dependency-free completion indicator. */
export function ProgressBar({
  value,
  tone = 'brand',
  className
}: {
  value: number;
  tone?: 'brand' | 'accent' | 'good' | 'warn' | 'risk';
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full transition-[width] duration-slow ease-standard', pct >= 100 ? PROGRESS_FILL.accent : PROGRESS_FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

const RING_STROKE_TONE: Record<Tone, string> = {
  neutral: 'stroke-ink-4',
  brand: 'stroke-brand',
  accent: 'stroke-accent',
  good: 'stroke-good',
  warn: 'stroke-warn',
  risk: 'stroke-risk'
};

/** Compact circular completion display for project and milestone summaries. */
export function ProgressRing({
  value,
  tone = 'brand',
  size = 58,
  stroke = 5,
  label
}: {
  value: number;
  tone?: Tone;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const strokeClass = RING_STROKE_TONE[tone];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={label ?? `${pct}% complete`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-surface-3" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className={strokeClass}
        style={{ transition: 'stroke-dashoffset var(--motion-slow) var(--ease-standard)' }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="tnum fill-ink text-[11px] font-semibold">
        {pct}%
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------ EmptyState -- */

export function EmptyState({ icon, title, hint, action }: { icon?: IconName; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line-2 bg-surface/60 px-6 py-12 text-center">
      {icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-ink-3">
          <Icon name={icon} className="h-5 w-5" />
        </span>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-[13px] text-ink-3">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* --------------------------------------------------------------- Segmented -- */

export interface SegmentedItem {
  value: string;
  label: string;
  icon?: IconName;
}

export function Segmented({ items, value, onValueChange }: { items: SegmentedItem[]; value: string; onValueChange: (value: string) => void }) {
  return (
    <div className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div role="tablist" className="inline-flex min-w-full items-center gap-0.5 rounded-xl border border-line bg-surface-2 p-0.5 sm:min-w-0 sm:rounded-lg">
        {items.map((item) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onValueChange(item.value)}
              className={cx(
                'inline-flex min-h-10 min-w-max flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3 py-2 text-[13px] font-medium transition-colors duration-fast sm:min-h-0 sm:flex-none sm:rounded-[7px] sm:py-1.5',
                active ? 'bg-surface text-ink shadow-card' : 'text-ink-3 hover:text-ink'
              )}
            >
              {item.icon && <Icon name={item.icon} className="h-4 w-4" />}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Charts --
 * Hand-rolled SVG/CSS, matching the same no-new-dependency approach the
 * command app's Rail/Ring/SlotMeter single-value indicators already use —
 * these are the multi-value/multi-series generalization of that pattern.
 */

const BAR_TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-ink-4',
  brand: 'bg-brand',
  accent: 'bg-accent',
  good: 'bg-good',
  warn: 'bg-warn',
  risk: 'bg-risk'
};

const STROKE_TONE_CLASS: Record<Tone, string> = {
  neutral: 'stroke-ink-4',
  brand: 'stroke-brand',
  accent: 'stroke-accent',
  good: 'stroke-good',
  warn: 'stroke-warn',
  risk: 'stroke-risk'
};

const TEXT_TONE_CLASS: Record<Tone, string> = {
  neutral: 'text-ink-4',
  brand: 'text-brand',
  accent: 'text-accent',
  good: 'text-good',
  warn: 'text-warn',
  risk: 'text-risk'
};

export interface BarChartDatum {
  label: string;
  value: number;
  tone?: Tone;
}

/** Horizontal grouped bars — team load, pipeline-by-stage, cost breakdowns, etc. */
export function BarChart({
  data,
  maxValue,
  valueFormatter = (v) => String(v)
}: {
  data: BarChartDatum[];
  maxValue?: number;
  valueFormatter?: (value: number) => string;
}) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-[12px] text-ink-3">{d.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className={cx('h-full rounded-full transition-[width] duration-slow ease-standard', BAR_TONE_CLASS[d.tone ?? 'brand'])}
              style={{ width: `${Math.min((d.value / max) * 100, 100)}%` }}
            />
          </div>
          <span className="tnum w-14 shrink-0 text-right text-[12px] text-ink-2">{valueFormatter(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  tone?: Tone;
}

/** Multi-segment donut — generalizes Ring's single-arc stroke-dasharray math to N segments with a legend. */
export function Donut({ segments, size = 96, stroke = 14 }: { segments: DonutSegment[]; size?: number; stroke?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="inline-flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-surface-2" />
        {segments.map((seg) => {
          const fraction = seg.value / total;
          const dash = fraction * circumference;
          const offset = -cumulative * circumference;
          cumulative += fraction;
          return (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              className={STROKE_TONE_CLASS[seg.tone ?? 'brand']}
            />
          );
        })}
      </svg>
      <ul className="space-y-1.5">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2 text-[12px] text-ink-2">
            <Dot tone={seg.tone ?? 'brand'} />
            <span className="truncate">{seg.label}</span>
            <span className="tnum text-ink-4">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A simple SVG trend polyline — completion-rate/cash/velocity over time. */
export function Sparkline({ values, width = 120, height = 32, tone = 'brand' }: { values: number[]; width?: number; height?: number; tone?: Tone }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / range) * height}`)
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cx('overflow-visible', TEXT_TONE_CLASS[tone])} aria-hidden>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
