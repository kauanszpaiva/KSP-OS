import Link from "next/link";
import { IncShell, ownerRoleLabel } from "../../components/inc-shell";
import { getBlueprints } from "../../lib/blueprints-data";
import { requireIncOwner } from "../../lib/inc-session";
import { getServerSupabase } from "../../lib/supabase";

const KIND_LABEL: Record<string, string> = {
  software: "Software",
  system: "System",
  process: "Process",
  infrastructure: "Infrastructure",
};

const KIND_ICON: Record<string, string> = {
  software: "▣",
  system: "▤",
  process: "⇄",
  infrastructure: "☰",
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function IncBlueprintsPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const blueprints = supabase ? await getBlueprints(supabase) : [];

  const active = blueprints.filter((b) => b.status === "active");
  const totalNodes = blueprints.reduce((sum, b) => sum + (b.canvas?.nodes?.length ?? 0), 0);
  const kinds = new Set(blueprints.map((b) => b.kind)).size;

  const metricCards = [
    { label: "Blueprints", value: blueprints.length, note: "Designs in the library", icon: "layers" },
    { label: "Active", value: active.length, note: "Live and in use", icon: "check" },
    { label: "Flowchart nodes", value: totalNodes, note: "Across all blueprints", icon: "sitemap" },
    { label: "Kinds in use", value: kinds, note: "software · system · process · infrastructure", icon: "target" },
  ];

  return (
      <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
        <section className="ownerHero">
          <div>
            <div className="eyebrow">Design &amp; architecture</div>
            <h1>Blueprints</h1>
          <p>
            Create, visualize and manage blueprints of software, systems and processes — each tied to a project, with
            interactive flowcharts shared with Command.
          </p>
        </div>
        <aside className="heroAside">
          Blueprints are scoped to the organization and readable by every internal member; edits flow through the same
          RLS policies as the rest of the operating system.
        </aside>
      </section>

      <section className="section" aria-labelledby="blueprint-summary">
        <div className="sectionHeader">
          <h2 id="blueprint-summary">Library posture</h2>
          <p>Blueprints returned to this owner session</p>
        </div>
        <div className="statGrid">
          {metricCards.map((metric, index) => (
            <article key={metric.label} className="statCard" style={{ animationDelay: `${index * 60}ms` }}>
              <header className="statHead">
                <span className="statLabel">{metric.label}</span>
                <span className="statIcon">{KIND_ICON[metric.label] ?? "◆"}</span>
              </header>
              <div className="statValue tnum">{metric.value}</div>
              <p className="statNote">{metric.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="blueprint-library">
        <div className="sectionHeader">
          <h2 id="blueprint-library">Library</h2>
          <p>Open a blueprint to edit its interactive flowchart</p>
        </div>

        {blueprints.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ fontWeight: 600, color: "var(--ink)" }}>No blueprints yet.</p>
            <p style={{ marginTop: "0.4rem", color: "var(--muted)", fontSize: "0.9rem" }}>
              Draft the first software, system or process design and attach it to a project.
            </p>
            <Link className="primaryButton" href="/blueprints/new" style={{ marginTop: "1.25rem", display: "inline-flex" }}>
              + New blueprint
            </Link>
          </div>
        ) : (
          <div className="grid">
            {blueprints.map((blueprint) => {
              const nodes = blueprint.canvas?.nodes?.length ?? 0;
              const edges = blueprint.canvas?.edges?.length ?? 0;
              const statusTone =
                blueprint.status === "active"
                  ? "var(--success)"
                  : blueprint.status === "archived"
                    ? "var(--muted)"
                    : "var(--warning)";
              return (
                <Link key={blueprint.id} href={`/blueprints/${blueprint.id}`} className="card cardLink">
                  <div className="cardTop">
                    <span className="cardLabel">
                      {KIND_ICON[blueprint.kind] ?? "◆"} {KIND_LABEL[blueprint.kind] ?? "System"}
                    </span>
                    <span className="status" style={{ color: statusTone }}>
                      {blueprint.status}
                    </span>
                  </div>
                  <h3 style={{ margin: "0.5rem 0 0.25rem", fontSize: "1.05rem", color: "var(--ink)" }}>
                    {blueprint.name}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--muted)",
                      fontSize: "0.85rem",
                      lineHeight: 1.4,
                      minHeight: "2.4em",
                    }}
                  >
                    {blueprint.description || "No description yet."}
                  </p>
                  <div
                    className="cardTop"
                    style={{ marginTop: "0.9rem", borderTop: "1px solid var(--line)", paddingTop: "0.7rem" }}
                  >
                    <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      {nodes} nodes · {edges} links
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      {blueprint.projectName ? blueprint.projectName : "Standalone"}
                      {blueprint.updated_at ? ` · ${shortDate(blueprint.updated_at)}` : ""}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </IncShell>
  );
}
