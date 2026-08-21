import { PageHeader } from '../../(app)/_components/ui';
import { requireSession } from '../../../lib/session';

export const dynamic = 'force-dynamic';

const TOOLS = [
  'brain_search', 'list_truth', 'list_sources', 'list_context_packs', 'get_context_pack', 'list_handoffs',
  'capture', 'add_truth', 'add_source', 'create_context_pack', 'create_handoff', 'complete_handoff'
];

export default async function FounderAiAccessPage() {
  await requireSession();
  const configured = process.env.NEXT_PUBLIC_COMMAND_URL?.replace(/\/$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null;
  const baseUrl = configured || vercel || 'https://ksp-os-command.vercel.app';
  const endpoint = `${baseUrl}/api/founder/mcp`;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Private · Connections"
        title="AI Access"
        description="The access boundary between your private Second Brain and external AI clients. The Founder MCP is separate from the company-wide MCP and requires a founder-authenticated user on every request."
      />

      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">Founder MCP endpoint</p>
        <code className="mt-2 block break-all rounded-xl bg-surface-2 px-4 py-3 text-[12.5px] text-ink">{endpoint}</code>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div><p className="text-[10px] uppercase tracking-[0.1em] text-ink-4">Transport</p><p className="mt-1 text-[12.5px] font-medium text-ink-2">Streamable HTTP</p></div>
          <div><p className="text-[10px] uppercase tracking-[0.1em] text-ink-4">Authentication</p><p className="mt-1 text-[12.5px] font-medium text-ink-2">Bearer · founder session</p></div>
          <div><p className="text-[10px] uppercase tracking-[0.1em] text-ink-4">Scope</p><p className="mt-1 text-[12.5px] font-medium text-ink-2">Founder-only + RLS</p></div>
        </div>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-[13px] font-semibold text-ink">Available Brain tools</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {TOOLS.map((tool) => <code key={tool} className="rounded-md bg-surface-2 px-2 py-1 text-[10.5px] text-ink-2">{tool}</code>)}
          </div>
          <p className="mt-4 text-[11.5px] leading-5 text-ink-4">Writes only affect your private Brain. There is no MCP tool here for payments, access grants, production deploys, Company Canon changes or other high-risk company actions.</p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-[13px] font-semibold text-ink">Connection rule</h2>
          <ol className="mt-3 space-y-2 text-[12px] leading-5 text-ink-3">
            <li><span className="mr-2 font-semibold text-ink">1.</span>Add the endpoint in a remote MCP-compatible client.</li>
            <li><span className="mr-2 font-semibold text-ink">2.</span>Authenticate as your own KSP founder user.</li>
            <li><span className="mr-2 font-semibold text-ink">3.</span>Call <code className="text-ink">brain_search</code> or <code className="text-ink">list_truth</code> to verify access.</li>
            <li><span className="mr-2 font-semibold text-ink">4.</span>Use Handoffs + Context Packs to move work between AIs.</li>
          </ol>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-surface-2 px-5 py-4">
        <p className="text-[12px] font-medium text-ink-2">Credential safety</p>
        <p className="mt-1 text-[11.5px] leading-5 text-ink-4">Do not save access tokens inside Truth, Sources, Context Packs, Handoffs, GitHub or AI prompts. Credentials belong only in the connector authentication UI or a secure credential store.</p>
      </section>
    </div>
  );
}
