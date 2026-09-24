import type { ReactNode } from 'react';
import { CountUp } from './count-up';
import { Icon, type IconName } from './icons';
import {
  linePath,
  maxValue,
  percentLabel,
  ringSegments,
  riseDelay,
  statusTone,
  type Bucket,
  type Distribution,
  type StatusTone
} from '../lib/visual-data';

/**
 * KSP INC visual-data primitives.
 *
 * These are presentational only: they receive aggregates that were computed from
 * canonical rows and never fetch, invent or extrapolate a figure. Every visual
 * here also exposes its values as text, so screen readers and printed/PDF
 * surfaces get the same information the chart encodes.
 *
 * Animation is CSS-driven (transform/opacity only) and is switched off globally
 * by the `prefers-reduced-motion` guard in `globals.css`.
 */

const TONE_CLASS: Record<StatusTone, string> = {
  ok: 'toneOk',
  warning: 'toneWarning',
  risk: 'toneRisk',
  neutral: 'toneNeutral'
};

export function StatGrid({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="statGrid" role="group" aria-label={label}>
      {children}
    </div>
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
  visual
}: {
  label: string;
  value?: number | null;
  valueText?: string;
  note?: string;
  icon?: IconName;
  tone?: StatusTone;
  index?: number;
  visual?: ReactNode;
}) {
  return (
    <article className={`statCard rise ${TONE_CLASS[tone]}`} style={riseDelay(index)}>
      <header className="statHead">
        <span className="statLabel">{label}</span>
        {icon ? (
          <span className="statIcon">
            <Icon name={icon} size={16} />
          </span>
        ) : null}
      </header>
      <div className="statValue tnum">
        {valueText != null ? valueText : <CountUp value={value ?? null} />}
      </div>
      {note ? <p className="statNote">{note}</p> : null}
      {visual ? <div className="statVisual">{visual}</div> : null}
    </article>
  );
}

export function Panel({
  title,
  note,
  children,
  action,
  index = 0
}: {
  title: string;
  note?: string;
  children: ReactNode;
  action?: ReactNode;
  index?: number;
}) {
  return (
    <section className="panel rise" style={riseDelay(index)}>
      <header className="panelHead">
        <div>
          <h3 className="panelTitle">{title}</h3>
          {note ? <p className="panelNote">{note}</p> : null}
        </div>
        {action ? <div className="panelAction">{action}</div> : null}
      </header>
      <div className="panelBody">{children}</div>
    </section>
  );
}

export function VisualGrid({ children }: { children: ReactNode }) {
  return <div className="visualGrid">{children}</div>;
}

export function DistributionBars({
  items,
  tone = 'neutral',
  emptyLabel
}: {
  items: Distribution[];
  tone?: StatusTone | 'scale';
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="visualEmpty">{emptyLabel}</p>;
  }

  const largest = maxValue(items);

  return (
    <ul className="bars">
      {items.map((item, index) => {
        const width = largest === 0 ? 0 : (item.value / largest) * 100;
        const resolved: StatusTone = tone === 'scale' ? 'neutral' : tone === 'neutral' ? statusTone(item.label) : tone;
        return (
          <li className="barRow" key={item.label}>
            <div className="barMeta">
              <span className="barLabel">{item.label}</span>
              <span className="barValue tnum">
                {item.value}
                <em>{percentLabel(item.ratio)}</em>
              </span>
            </div>
            <div className="barTrack">
              <span
                className={`barFill ${TONE_CLASS[resolved]}`}
                style={{ ...riseDelay(index, 60), width: `${width}%` }}
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
  emptyLabel
}: {
  items: Distribution[];
  centerValue: string;
  centerLabel: string;
  caption?: string;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="visualEmpty">{emptyLabel}</p>;
  }

  const segments = ringSegments(items, DONUT_RADIUS);
  const summary = items
    .map((item) => `${item.label}: ${item.value} (${percentLabel(item.ratio)})`)
    .join('; ');

  return (
    <div className="donut">
      <div className="donutFigure">
        <svg aria-hidden="true" className="donutSvg" viewBox="0 0 120 120">
          <circle className="donutTrack" cx={DONUT_CENTER} cy={DONUT_CENTER} fill="none" r={DONUT_RADIUS} strokeWidth={13} />
          <g transform={`rotate(-90 ${DONUT_CENTER} ${DONUT_CENTER})`}>
            {segments.map((segment, index) => (
              <circle
                className={`donutArc ${TONE_CLASS[statusTone(segment.label)]}`}
                cx={DONUT_CENTER}
                cy={DONUT_CENTER}
                fill="none"
                key={segment.label}
                r={DONUT_RADIUS}
                strokeDasharray={segment.dashArray}
                strokeDashoffset={segment.dashOffset}
                strokeWidth={13}
                style={riseDelay(index, 50)}
              />
            ))}
          </g>
        </svg>
        <div className="donutCenter">
          <strong className="tnum">{centerValue}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <div className="donutBody">
        <ul className="legend" aria-label={caption ?? centerLabel}>
          {items.map((item) => (
            <li className="legendItem" key={item.label}>
              <span className={`legendSwatch ${TONE_CLASS[statusTone(item.label)]}`} aria-hidden="true" />
              <span className="legendLabel">{item.label}</span>
              <span className="legendValue tnum">{item.value}</span>
              <span className="legendShare tnum">{percentLabel(item.ratio)}</span>
            </li>
          ))}
        </ul>
        <p className="chartSummary">{summary}</p>
      </div>
    </div>
  );
}

export function Sparkline({
  buckets,
  caption,
  tone = 'neutral'
}: {
  buckets: Bucket[];
  caption: string;
  tone?: StatusTone;
}) {
  const values = buckets.map((bucket) => bucket.value);
  const total = values.reduce((acc, value) => acc + value, 0);
  const width = 260;
  const height = 68;
  const geometry = linePath(values, { width, height, padding: 3 });
  const peak = values.reduce((acc, value) => Math.max(acc, value), 0);

  return (
    <figure className="spark">
      <svg
        aria-hidden="true"
        className={`sparkSvg ${TONE_CLASS[tone]}`}
        height={height}
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
      >
        {geometry.area ? <path className="sparkArea" d={geometry.area} /> : null}
        {geometry.line ? (
          <path className="sparkLine" d={geometry.line} pathLength={1} vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>
      <div className="sparkAxis" aria-hidden="true">
        <span>{buckets[0]?.label}</span>
        <span>{buckets[Math.floor(buckets.length / 2)]?.label}</span>
        <span>{buckets[buckets.length - 1]?.label}</span>
      </div>
      <figcaption className="sparkCaption">
        {caption}
        <span className="tnum"> · {total} total · peak {peak}/day</span>
      </figcaption>
    </figure>
  );
}

export function ActivityStrip({
  buckets,
  caption,
  tone = 'neutral'
}: {
  buckets: Bucket[];
  caption: string;
  tone?: StatusTone;
}) {
  const values = buckets.map((bucket) => bucket.value);
  const peak = values.reduce((acc, value) => Math.max(acc, value), 0);
  const total = values.reduce((acc, value) => acc + value, 0);

  return (
    <figure className="strip">
      <div
        className={`stripCells ${TONE_CLASS[tone]}`}
        role="img"
        aria-label={`${caption}. ${total} events across ${buckets.length} days, peak ${peak} per day.`}
      >
        {buckets.map((bucket, index) => {
          const intensity = peak === 0 ? 0 : bucket.value / peak;
          return (
            <span
              className="stripCell"
              key={bucket.key}
              style={{
                ...riseDelay(index, 18),
                opacity: bucket.value === 0 ? 0.14 : 0.3 + intensity * 0.7,
                transform: `scaleY(${bucket.value === 0 ? 0.14 : 0.34 + intensity * 0.66})`
              }}
              title={`${bucket.label}: ${bucket.value}`}
            />
          );
        })}
      </div>
      <figcaption className="sparkCaption">
        {caption}
        <span className="tnum"> · {total} in {buckets.length} days</span>
      </figcaption>
    </figure>
  );
}

export function Meter({
  label,
  value,
  max,
  detail,
  tone = 'neutral',
  index = 0
}: {
  label: string;
  value: number;
  max: number;
  detail?: string;
  tone?: StatusTone;
  index?: number;
}) {
  const ratio = max <= 0 ? 0 : Math.min(Math.max(value / max, 0), 1);
  return (
    <div className="meter" style={riseDelay(index, 50)}>
      <div className="meterHead">
        <span className="meterLabel">{label}</span>
        <span className="meterValue tnum">{percentLabel(ratio)}</span>
      </div>
      <div className="meterTrack">
        <span className={`meterFill ${TONE_CLASS[tone]}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      {detail ? <p className="meterDetail">{detail}</p> : null}
    </div>
  );
}

export function StatusPill({ label, tone }: { label: string; tone?: StatusTone }) {
  const resolved = tone ?? statusTone(label);
  return <span className={`pill ${TONE_CLASS[resolved]}`}>{label}</span>;
}

export function TrendBadge({ delta, label }: { delta: number; label: string }) {
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const icon: IconName = direction === 'up' ? 'trend-up' : direction === 'down' ? 'trend-down' : 'flat';
  const tone: StatusTone = direction === 'up' ? 'ok' : direction === 'down' ? 'risk' : 'neutral';
  return (
    <span className={`trend ${TONE_CLASS[tone]}`}>
      <Icon name={icon} size={13} />
      <span className="tnum">{delta > 0 ? `+${delta}` : delta}</span>
      <em>{label}</em>
    </span>
  );
}

export function DataUnavailable({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="unavailable">
      <Icon name="info" size={16} />
      <div>
        <strong>{label}</strong>
        <span>{reason}</span>
      </div>
    </div>
  );
}
