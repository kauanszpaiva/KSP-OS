import type { ReactNode } from 'react';
import { cx, type Tone } from './primitives';
import { Icon, type IconName } from './icons';
import { CountUp } from './count-up';
import {
  linePath,
  maxValue,
  percentLabel,
  ringSegments,
  scaleOpacity,
  stagger,
  statusTone,
  type Bucket,
  type Distribution
} from './data-viz-model';

/**
 * KSP visual-data primitives.
 *
 * Presentational only: they receive aggregates that were computed from rows the
 * caller already fetched, and never fetch, invent or extrapolate a figure. Every
 * visual also exposes its values as text, so screen readers and print/PDF
 * surfaces get the same information the chart encodes.
 *
 * Animation is CSS-only (transform/opacity) and every animated element carries
 * `motion-reduce:animate-none`, so the OS "reduce motion" setting switches the
 * whole set off without a JS branch.
 *
 * Colour rules:
 *  - status series use the semantic good/warn/risk/neutral tones;
 *  - categorical series use a single-hue intensity scale (`tone="scale"`), so a
 *    brand colour can never be read as a status claim.
 */

export type VizTone = Tone | 'scale';

const ICON_TONE: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-3',
  brand: 'bg-brand-tint text-brand',
  accent: 'bg-accent-tint text-accent-strong',
  good: 'bg-good-tint text-good',
  warn: 'bg-warn-tint text-warn',
  risk: 'bg-risk-tint text-risk'
};

const BAR_TONE: Record<Tone, string> = {
  neutral: 'bg-ink-3',
  brand: 'bg-brand',
  accent: 'bg-accent',
  good: 'bg-good',
  warn: 'bg-warn',
  risk: 'bg-risk'
};

const STROKE_TONE: Record<Tone, string> = {
  neutral: 'stroke-ink-3',
  brand: 'stroke-brand',
  accent: 'stroke-accent',
  good: 'stroke-good',
  warn: 'stroke-warn',
  risk: 'stroke-risk'
};

const FILL_TONE: Record<Tone, string> = {
  neutral: 'fill-ink-3',
  brand: 'fill-brand',
  accent: 'fill-accent',
  good: 'fill-good',
  warn: 'fill-warn',
  risk: 'fill-risk'
};

const TEXT_TONE: Record<Tone, string> = {
  neutral: 'text-ink-3',
  brand: 'text-brand',
  accent: 'text-accent-strong',
  good: 'text-good',
  warn: 'text-warn',
  risk: 'text-risk'
};

const PILL_TONE: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  brand: 'bg-brand-tint text-brand',
  accent: 'bg-accent-tint text-accent-strong',
  good: 'bg-good-tint text-good',
  warn: 'bg-warn-tint text-warn',
  risk: 'bg-risk-tint text-risk'
};

/** Resolves `'scale'` to a neutral tone: the intensity comes from opacity. */
function resolveTone(tone: VizTone, label: string): Tone {
  if (tone === 'scale') return 'neutral';
  if (tone === 'neutral') return statusTone(label);
  return tone;
}

export function VisualGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('grid min-w-0 gap-4 md:grid-cols-2', className)}>{children}</div>;
}

/**
 * Titled section wrapper for a group of visual panels, so every board on every
 * surface reads with the same heading rhythm.
 */
export function VizBoard({
  title,
  note,
  aside,
  children,
  className
}: {
  title: string;
  note?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={title} className={cx('min-w-0 space-y-3', className)}>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-semibold text-ink">{title}</h2>
          {note ? <p className="mt-0.5 text-[11px] text-ink-3">{note}</p> : null}
        </div>
        {aside ? <span className="shrink-0 text-[10.5px] font-medium text-ink-4">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('grid min-w-0 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4', className)}>{children}</div>
  );
}

export function StatCard({
  label,
  value,
  valueText,
  note,
  icon,
  tone = 'neutral',
  index = 0,
  href,
  visual,
  className
}: {
  label: string;
  value?: number | null;
  valueText?: string;
  note?: string;
  icon?: IconName;
  tone?: Tone;
  index?: number;
  href?: string;
  visual?: ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-4">{label}</span>
        {icon ? (
          <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', ICON_TONE[tone])}>
            <Icon name={icon} className="h-[15px] w-[15px]" />
          </span>
        ) : null}
      </div>
      <div className="font-display text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums sm:text-[28px]">
        {valueText != null ? valueText : <CountUp value={value ?? null} />}
      </div>
      {note ? <p className="mt-auto text-[11.5px] leading-snug text-ink-3">{note}</p> : null}
      {visual ? <div className="mt-1">{visual}</div> : null}
    </>
  );

  const shell = cx(
    'group flex min-w-0 animate-fade-slide-up flex-col gap-2 rounded-xl border border-line bg-surface p-3.5 text-left shadow-card transition-[border-color,transform] duration-fast ease-standard motion-reduce:animate-none sm:p-4',
    href && 'hover:-translate-y-0.5 hover:border-line-2 motion-reduce:hover:translate-y-0',
    className
  );

  if (href) {
    return (
      <a className={shell} href={href} style={stagger(index, 45)}>
        {body}
      </a>
    );
  }

  return (
    <article className={shell} style={stagger(index, 45)}>
      {body}
    </article>
  );
}

export function VizPanel({
  title,
  note,
  action,
  children,
  index = 0,
  className
}: {
  title: string;
  note?: string;
  action?: ReactNode;
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <section
      className={cx(
        'flex min-w-0 animate-fade-slide-up flex-col rounded-xl border border-line bg-surface p-4 shadow-card motion-reduce:animate-none',
        className
      )}
      style={stagger(index, 50)}
    >
      <header className="mb-3 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[13.5px] font-semibold leading-tight text-ink">{title}</h3>
          {note ? <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{note}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function VisualEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line-2 bg-surface-2/50 px-3 py-3 text-[12px] leading-relaxed text-ink-3">
      {children}
    </p>
  );
}

export function DataUnavailable({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-line border-l-[3px] border-l-warn bg-warn-tint px-3 py-2.5">
      <Icon name="bell" className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
      <div className="min-w-0">
        <strong className="block text-[12.5px] font-semibold text-ink">{label}</strong>
        <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-3">{reason}</span>
      </div>
    </div>
  );
}

export function DistributionBars({
  items,
  tone = 'status',
  empty,
  valueSuffix,
  valueFormatter
}: {
  items: Distribution[];
  tone?: VizTone | 'status';
  empty: ReactNode;
  valueSuffix?: string;
  valueFormatter?: (value: number) => string;
}) {
  if (items.length === 0) {
    return <VisualEmpty>{empty}</VisualEmpty>;
  }

  const largest = maxValue(items);

  return (
    <ul className="grid gap-2.5">
      {items.map((item, index) => {
        const width = largest === 0 ? 0 : (item.value / largest) * 100;
        const resolved = tone === 'status' ? statusTone(item.label) : resolveTone(tone, item.label);
        return (
          <li key={item.label} className="min-w-0">
            <div className="mb-1 flex min-w-0 items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[12.5px] font-medium text-ink-2">{item.label}</span>
              <span className="shrink-0 text-[12px] font-semibold tabular-nums text-ink">
                {valueFormatter ? valueFormatter(item.value) : item.value}
                {valueSuffix ? <span className="ml-0.5 text-ink-3">{valueSuffix}</span> : null}{' '}
                <span className="text-[10.5px] font-medium text-ink-3">{percentLabel(item.ratio)}</span>
              </span>
            </div>
            <div className="h-[7px] w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={cx('h-full min-w-[3px] origin-left animate-grow-x rounded-full motion-reduce:animate-none', BAR_TONE[resolved])}
                style={{
                  width: `${width}%`,
                  opacity: tone === 'scale' ? scaleOpacity(index, items.length) : undefined,
                  ...stagger(index, 60)
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const DONUT_RADIUS = 44;
const DONUT_CENTER = 60;

export function DonutChart({
  items,
  centerValue,
  centerLabel,
  caption,
  empty,
  tone = 'status'
}: {
  items: Distribution[];
  centerValue: string;
  centerLabel: string;
  caption?: string;
  empty: ReactNode;
  tone?: VizTone | 'status';
}) {
  if (items.length === 0) {
    return <VisualEmpty>{empty}</VisualEmpty>;
  }

  const segments = ringSegments(items, DONUT_RADIUS);
  const summary = items.map((item) => `${item.label}: ${item.value} (${percentLabel(item.ratio)})`).join('; ');

  return (
    <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative grid shrink-0 place-items-center">
        <svg aria-hidden="true" className="h-[132px] w-[132px]" viewBox="0 0 120 120">
          <circle className="stroke-surface-2" cx={DONUT_CENTER} cy={DONUT_CENTER} fill="none" r={DONUT_RADIUS} strokeWidth={13} />
          <g transform={`rotate(-90 ${DONUT_CENTER} ${DONUT_CENTER})`}>
            {segments.map((segment, index) => {
              const resolved = tone === 'status' ? statusTone(segment.label) : resolveTone(tone, segment.label);
              return (
                <circle
                  className={cx('animate-fade-in motion-reduce:animate-none', STROKE_TONE[resolved])}
                  cx={DONUT_CENTER}
                  cy={DONUT_CENTER}
                  fill="none"
                  key={segment.label}
                  r={DONUT_RADIUS}
                  strokeDasharray={segment.dashArray}
                  strokeDashoffset={segment.dashOffset}
                  strokeWidth={13}
                  style={stagger(index, 50)}
                />
              );
            })}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <strong className="font-display text-[21px] font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums">
            {centerValue}
          </strong>
          <span className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-4">{centerLabel}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <ul aria-label={caption ?? centerLabel} className="grid gap-1.5">
          {items.map((item, index) => {
            const resolved = tone === 'status' ? statusTone(item.label) : resolveTone(tone, item.label);
            return (
              <li className="grid min-w-0 grid-cols-[9px_minmax(0,1fr)_auto_auto] items-center gap-2.5" key={item.label}>
                <span
                  className={cx('h-[9px] w-[9px] rounded-[3px]', BAR_TONE[resolved])}
                  style={{ opacity: tone === 'scale' ? scaleOpacity(index, items.length) : undefined }}
                />
                <span className="min-w-0 truncate text-[12px] text-ink-2">{item.label}</span>
                <span className="text-[12px] font-semibold tabular-nums text-ink">{item.value}</span>
                <span className="min-w-[34px] text-right text-[11px] font-medium tabular-nums text-ink-3">{percentLabel(item.ratio)}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2.5 border-t border-line pt-2 text-[11px] leading-snug text-ink-3">{summary}</p>
      </div>
    </div>
  );
}

export function TrendSparkline({
  buckets,
  caption,
  tone = 'brand'
}: {
  buckets: Bucket[];
  caption: string;
  tone?: Tone;
}) {
  const values = buckets.map((bucket) => bucket.value);
  const total = values.reduce((acc, value) => acc + value, 0);
  const peak = values.reduce((acc, value) => Math.max(acc, value), 0);
  const width = 260;
  const height = 68;
  const geometry = linePath(values, { width, height, padding: 3 });

  return (
    <figure className="min-w-0">
      <svg aria-hidden="true" className="block h-[68px] w-full" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
        {geometry.area ? <path className={cx('opacity-[0.10]', FILL_TONE[tone])} d={geometry.area} /> : null}
        {geometry.line ? (
          <path
            className={cx('animate-ring-draw motion-reduce:animate-none', STROKE_TONE[tone])}
            d={geometry.line}
            fill="none"
            pathLength={1}
            strokeLinecap="round"
            strokeWidth={2}
            style={{ strokeDasharray: 1 }}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>
      <div aria-hidden="true" className="mt-1 flex justify-between text-[10px] tabular-nums text-ink-4">
        <span>{buckets[0]?.label}</span>
        <span>{buckets[Math.floor(buckets.length / 2)]?.label}</span>
        <span>{buckets[buckets.length - 1]?.label}</span>
      </div>
      <figcaption className="mt-1.5 text-[11.5px] leading-snug text-ink-3">
        {caption}
        <span className="tabular-nums"> · {total} total · peak {peak}/day</span>
      </figcaption>
    </figure>
  );
}

export function ActivityStrip({
  buckets,
  caption,
  tone = 'brand'
}: {
  buckets: Bucket[];
  caption: string;
  tone?: Tone;
}) {
  const values = buckets.map((bucket) => bucket.value);
  const peak = values.reduce((acc, value) => Math.max(acc, value), 0);
  const total = values.reduce((acc, value) => acc + value, 0);

  return (
    <figure className="min-w-0">
      <div
        aria-label={`${caption}. ${total} events across ${buckets.length} days, peak ${peak} per day.`}
        className="flex h-[68px] items-end gap-[3px]"
        role="img"
      >
        {buckets.map((bucket, index) => {
          const intensity = peak === 0 ? 0 : bucket.value / peak;
          return (
            <span
              className={cx('min-w-[3px] flex-1 origin-bottom animate-fade-in rounded-[2px] motion-reduce:animate-none', BAR_TONE[tone])}
              key={bucket.key}
              style={{
                ...stagger(index, 18),
                height: '100%',
                opacity: bucket.value === 0 ? 0.14 : 0.3 + intensity * 0.7,
                transform: `scaleY(${bucket.value === 0 ? 0.14 : 0.34 + intensity * 0.66})`
              }}
              title={`${bucket.label}: ${bucket.value}`}
            />
          );
        })}
      </div>
      <figcaption className="mt-1.5 text-[11.5px] leading-snug text-ink-3">
        {caption}
        <span className="tabular-nums"> · {total} in {buckets.length} days</span>
      </figcaption>
    </figure>
  );
}

export function Meter({
  label,
  value,
  max,
  detail,
  tone = 'brand',
  index = 0
}: {
  label: string;
  value: number;
  max: number;
  detail?: string;
  tone?: Tone;
  index?: number;
}) {
  const ratio = max <= 0 ? 0 : Math.min(Math.max(value / max, 0), 1);
  return (
    <div className="min-w-0" style={stagger(index, 50)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[12.5px] font-medium text-ink-2">{label}</span>
        <span className="text-[11.5px] font-semibold tabular-nums text-ink-3">{percentLabel(ratio)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cx('h-full min-w-[3px] origin-left animate-grow-x rounded-full motion-reduce:animate-none', BAR_TONE[tone])}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      {detail ? <p className="mt-1.5 text-[11px] leading-snug text-ink-3">{detail}</p> : null}
    </div>
  );
}

export function TrendBadge({ delta, label }: { delta: number; label: string }) {
  const tone: Tone = delta > 0 ? 'good' : delta < 0 ? 'risk' : 'neutral';
  const icon: IconName = delta > 0 ? 'check' : delta < 0 ? 'bell' : 'pulse';
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-[11px] font-semibold', TEXT_TONE[tone])}>
      <Icon name={icon} className="h-3.5 w-3.5" />
      <span className="tabular-nums">{delta > 0 ? `+${delta}` : delta}</span>
      <em className="font-medium not-italic opacity-75">{label}</em>
    </span>
  );
}

export function StatusPill({ label, tone }: { label: string; tone?: Tone }) {
  const resolved = tone ?? statusTone(label);
  return (
    <span
      className={cx(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
        PILL_TONE[resolved]
      )}
    >
      {label}
    </span>
  );
}
