import type { ListRow, MetricState } from "../lib/inc-data";

export function OwnerPageHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: string;
}) {
  return (
    <section className="ownerHero">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {aside ? <aside className="heroAside">{aside}</aside> : null}
    </section>
  );
}

export function MetricGrid({ metrics }: { metrics: MetricState[] }) {
  return (
    <div className="metricGrid">
      {metrics.map((metric) => (
        <article className="metricCard" key={metric.label}>
          <small>{metric.note}</small>
          <strong>{metric.value == null ? "—" : metric.value}</strong>
          <span>{metric.label}</span>
        </article>
      ))}
    </div>
  );
}

export function OwnerList({
  rows,
  empty,
}: {
  rows: ListRow[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <div className="emptyPanel">{empty}</div>;
  }

  return (
    <div className="ownerList">
      {rows.map((row) => (
        <article className="ownerListRow" key={row.id}>
          <div>
            <strong>{row.primary}</strong>
            <span>{row.secondary}</span>
          </div>
          {row.meta ? <small>{row.meta}</small> : null}
        </article>
      ))}
    </div>
  );
}

export function SurfaceStatus({
  title,
  body,
  tone = "neutral",
}: {
  title: string;
  body: string;
  tone?: "neutral" | "attention" | "ok";
}) {
  return (
    <div className={`surfaceStatus ${tone}`}>
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}
