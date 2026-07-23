/**
 * Hand-rolled SVG/CSS chart primitives in the house style: single-hue marks,
 * tabular figures, tokens for color, text labels (never color-only meaning).
 */
import type { ReactNode } from 'react';

const TONE_BG: Record<string, string> = {
  brand: 'bg-brand',
  good: 'bg-good',
  warn: 'bg-warn',
  risk: 'bg-risk',
  neutral: 'bg-ink-4'
};

const TONE_FILL: Record<string, string> = {
  brand: '#1f4e79',
  good: '#1f6f52',
  warn: '#8a5a12',
  risk: '#a52a22',
  neutral: '#9aa7b6'
};

export interface Segment {
  label: string;
  value: number;
  tone: keyof typeof TONE_BG;
}

/** Horizontal stacked bar with a text legend beneath. */
export function StackedRail({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-line" role="img" aria-label="Distribution by state">
        {visible.map((s) => (
          <span key={s.label} className={TONE_BG[s.tone]} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label}: ${s.value}`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
            <span className={`h-2 w-2 rounded-full ${TONE_BG[s.tone]}`} />
            {s.label} <span className="tnum font-medium text-ink-2">{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Simple polyline sparkline over a series of values. */
export function Sparkline({ values, tone = 'brand', height = 40 }: { values: number[]; tone?: keyof typeof TONE_FILL; height?: number }) {
  if (values.length === 0) return null;
  const w = 100;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values.map((v, i) => `${i * step},${height - (v / max) * (height - 4) - 2}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-10 w-full" role="img" aria-label="Trend">
      <polyline points={points} fill="none" stroke={TONE_FILL[tone]} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Vertical bar series with tabular value labels. */
export function BarSeries({ data, tone = 'brand' }: { data: { label: string; value: number }[]; tone?: keyof typeof TONE_BG }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-32 items-end gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="tnum text-[10px] text-ink-3">{d.value}</span>
          <div className={`w-full rounded-t ${TONE_BG[tone]}`} style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 3 : 0 }} />
          <span className="w-full truncate text-center text-[10px] text-ink-4" title={d.label}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">{title}</h3>
      {children}
    </div>
  );
}
