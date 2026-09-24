import type { MetricState } from '../lib/inc-data';
import { Icon, type IconName } from './icons';
import { StatCard, StatGrid } from './visual-data';

export function OwnerPageHeader({
  eyebrow,
  title,
  description,
  aside,
  icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: string;
  icon?: IconName;
}) {
  return (
    <section className="ownerHero">
      <div>
        <div className="eyebrow">
          {icon ? <Icon className="eyebrowIcon" name={icon} size={13} /> : null}
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {aside ? <aside className="heroAside">{aside}</aside> : null}
    </section>
  );
}

/** Picks an icon from the canonical metric label so owner cards scan quickly. */
function metricIcon(label: string): IconName {
  const token = label.toLowerCase();
  if (token.includes('business_unit')) return 'sitemap';
  if (token.includes('project')) return 'layers';
  if (token.includes('task')) return 'check';
  if (token.includes('client')) return 'briefcase';
  if (token.includes('partner')) return 'globe';
  if (token.includes('membership')) return 'users';
  if (token.includes('profile') || token.includes('identit')) return 'users';
  if (token.includes('grant') || token.includes('permission') || token.includes('access')) return 'key';
  if (token.includes('job') || token.includes('background')) return 'clock';
  if (token.includes('integration') || token.includes('connection')) return 'server';
  return 'pulse';
}

/**
 * Owner KPI grid.
 *
 * A `null` value means the environment did not answer for that table, so the
 * card renders `—` with an attention tone instead of a zero the owner could
 * mistake for real data.
 */
export function MetricGrid({ metrics }: { metrics: MetricState[] }) {
  return (
    <StatGrid label="Owner metrics">
      {metrics.map((metric, index) => {
        const unavailable = metric.value == null;
        return (
          <StatCard
            icon={metricIcon(metric.label)}
            index={index}
            key={metric.label}
            label={metric.label.replace(/_/g, ' ')}
            note={metric.note}
            tone={unavailable ? 'warning' : 'neutral'}
            value={metric.value}
          />
        );
      })}
    </StatGrid>
  );
}

export function SurfaceStatus({
  title,
  body,
  tone = 'neutral',
}: {
  title: string;
  body: string;
  tone?: 'neutral' | 'attention' | 'ok';
}) {
  return (
    <div className={`surfaceStatus ${tone}`}>
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

