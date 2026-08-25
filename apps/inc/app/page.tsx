import { SignOutButton } from '../components/sign-out-button';
import { requireIncOwner } from '../lib/inc-session';

const commandUrl = process.env.NEXT_PUBLIC_COMMAND_URL ?? 'https://appkspdominion.com';
const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://kspdominionportal.com';
const networkUrl = process.env.NEXT_PUBLIC_NETWORK_URL;

const ownerControls = [
  ['Access Directory', `${commandUrl}/inc/access`, 'See effective access and owner-gated grants across identities.'],
  ['Structure & Access', `${commandUrl}/divisions`, 'Control divisions, business-unit scope and governed internal access.'],
  ['People', `${commandUrl}/team`, 'Manage the internal KSP people surface from its canonical workflow.'],
  ['Clients', `${commandUrl}/clients`, 'Enter client governance without duplicating Portal authorization.'],
  ['Finance & approvals', `${commandUrl}/finance`, 'Open the existing governed financial approval surface.'],
  ['Platform & audit', `${commandUrl}/control-center`, 'Inspect platform posture, audit and release-sensitive controls.']
] as const;

export default async function IncHomePage() {
  const context = await requireIncOwner();
  const roleLabel = context.internalRoles.includes('founder_ceo') ? 'Founder & CEO' : 'Executive Operations';

  const surfaces = [
    {
      label: 'Owner plane',
      title: 'KSP INC',
      description: 'Global governance, access, approvals and cross-surface oversight.',
      href: '/',
      status: 'Current'
    },
    {
      label: 'Internal operations',
      title: 'Command',
      description: 'KSP teams, projects, delivery, finance and internal operating workflows.',
      href: commandUrl,
      status: 'Live'
    },
    {
      label: 'Clients',
      title: 'Portal',
      description: 'Client-safe projects, approvals, files, meetings and delivery visibility.',
      href: portalUrl,
      status: 'Live'
    },
    {
      label: 'Subcontractors & partners',
      title: 'Network',
      description: 'Scoped assignments and collaboration for subcontractors and external partners.',
      href: networkUrl,
      status: networkUrl ? 'Live' : 'Endpoint gated'
    }
  ];

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark" aria-hidden="true">K</div>
          <div className="brandText">
            <strong>KSP INC</strong>
            <span>Owner control plane</span>
          </div>
        </div>
        <div className="ownerBar">
          <span>{context.user.displayName} · {roleLabel}</span>
          <SignOutButton />
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <div>
            <div className="eyebrow">Global owner layer</div>
            <h1>One company.<br />Four experiences.</h1>
            <p>
              KSP INC sits above Command, Portal and Network as the owner plane. Identity and data stay shared;
              authority stays server-side; every non-owner surface remains scoped to its real job.
            </p>
          </div>
          <aside className="heroAside">
            <strong>Owner boundary</strong>
            <span>
              Access is granted by the canonical owner roles, never by a hardcoded name or email. Founder OS remains
              a separate founder-only private boundary.
            </span>
          </aside>
        </section>

        <section className="section" aria-labelledby="systems-heading">
          <div className="sectionHeader">
            <h2 id="systems-heading">System map</h2>
            <p>KSP INC → Command · Portal · Network</p>
          </div>
          <div className="grid">
            {surfaces.map((surface) => {
              const enabled = Boolean(surface.href);
              return (
                <article className="card" key={surface.title}>
                  <div>
                    <div className="cardTop">
                      <span className="cardLabel">{surface.label}</span>
                      <span className={`status ${surface.status === 'Live' || surface.status === 'Current' ? 'live' : ''}`}>
                        {surface.status}
                      </span>
                    </div>
                    <h3>{surface.title}</h3>
                    <p>{surface.description}</p>
                  </div>
                  {enabled ? (
                    <a className="cardLink" href={surface.href ?? undefined}>Open surface <span aria-hidden="true">↗</span></a>
                  ) : (
                    <span className="cardLink" aria-disabled="true">Configure deployment endpoint</span>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="section" aria-labelledby="controls-heading">
          <div className="sectionHeader">
            <h2 id="controls-heading">Owner controls</h2>
            <p>Canonical workflows; no duplicated authorization logic.</p>
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
            <p>What this standalone owner plane will and will not trust.</p>
          </div>
          <div className="posture">
            <div className="postureItem"><small>Authorization</small><strong className="ok">Server + RLS authoritative</strong></div>
            <div className="postureItem"><small>MFA session</small><strong className={context.mfa ? 'ok' : 'attention'}>{context.mfa ? 'AAL2 verified' : 'Required for privileged writes'}</strong></div>
            <div className="postureItem"><small>Founder OS</small><strong>Separate private boundary</strong></div>
            <div className="postureItem"><small>Temporary grants</small><strong className="attention">Read-only until RLS is narrowed</strong></div>
          </div>
        </section>
      </main>
    </div>
  );
}
