import { IncShell, ownerRoleLabel } from "../components/inc-shell";
import { MetricGrid, SurfaceStatus } from "../components/owner-surface";
import { getOwnerMetrics } from "../lib/inc-data";
import { requireIncOwner } from "../lib/inc-session";
import { getServerSupabase } from "../lib/supabase";

const ownerControls = [
  ["Work", "/work", "See company execution across verticals without switching into Command."],
  ["People", "/people", "Internal KSP identities, roles and membership posture."],
  ["Access", "/access", "Business-unit membership, permanent grants and temporary access evidence."],
  ["Clients", "/clients", "Company-side client governance while Portal remains client-scoped."],
  ["Network", "/network", "Subcontractors, studios and external partner boundary."],
  ["Finance", "/finance", "Invoices, approvals and recurring operating costs."],
  ["Audit", "/audit", "Recent audit evidence for privileged and operational actions."],
  ["Platform", "/platform", "Authorization substrate and source/live promotion posture."],
] as const;

export default async function IncHomePage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const metrics = supabase ? await getOwnerMetrics(supabase) : [];

  return (
    <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <section className="hero">
        <div>
          <div className="eyebrow">Global owner layer</div>
          <h1>
            One company.
            <br />
            One owner workspace.
          </h1>
          <p>
            KSP INC is the operating surface for global owners. Command, Portal
            and Network remain separate persona experiences, while INC reads the
            same canonical identity, data, permissions and audit substrate.
          </p>
        </div>
        <aside className="heroAside">
          <strong>Owner boundary</strong>
          <span>
            Access is role-based, server-guarded and RLS-backed. Founder OS
            remains a separate founder-only boundary; global ownership never
            means anonymous bypass or impersonation.
          </span>
        </aside>
      </section>

      <SurfaceStatus
        title="Native INC migration is active"
        body="Core owner views now live inside apps/inc. Canonical mutations are moved only when the shared domain service and database boundary are proven, so the refactor does not duplicate privileged authorization logic."
        tone="ok"
      />

      <section className="section" aria-labelledby="company-heading">
        <div className="sectionHeader">
          <h2 id="company-heading">Company snapshot</h2>
          <p>Current authenticated environment</p>
        </div>
        <MetricGrid metrics={metrics} />
      </section>

      <section className="section" aria-labelledby="controls-heading">
        <div className="sectionHeader">
          <h2 id="controls-heading">Owner workspace</h2>
          <p>INC-native navigation</p>
        </div>
        <div className="controlGrid">
          {ownerControls.map(([title, href, description]) => (
            <a className="control" href={href} key={title}>
              <strong>{title}</strong>
              <span>{description}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="posture-heading">
        <div className="sectionHeader">
          <h2 id="posture-heading">Security posture</h2>
          <p>Owner access remains governed</p>
        </div>
        <div className="posture">
          <div className="postureItem">
            <small>Authorization</small>
            <strong className="ok">Server + RLS authoritative</strong>
          </div>
          <div className="postureItem">
            <small>MFA session</small>
            <strong className={ctx.mfa ? "ok" : "attention"}>
              {ctx.mfa ? "AAL2 verified" : "Required for privileged writes"}
            </strong>
          </div>
          <div className="postureItem">
            <small>Founder OS</small>
            <strong>Separate private boundary</strong>
          </div>
          <div className="postureItem">
            <small>Production lineage</small>
            <strong className="attention">Reconciliation required</strong>
          </div>
        </div>
      </section>
    </IncShell>
  );
}
