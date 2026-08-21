import { redirect } from 'next/navigation';
import { getServerSupabase } from '../../../lib/supabase';
import { readSession } from '../../../lib/session';

export const dynamic = 'force-dynamic';

export default async function OAuthConsentPage({
  searchParams
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: authorizationId } = await searchParams;
  if (!authorizationId || authorizationId.length > 2048) {
    return <ConsentError title="Invalid authorization request" detail="The OAuth request is missing its authorization identifier." />;
  }

  const session = await readSession();
  if (!session.configured) redirect('/setup');
  if (!session.context) {
    const next = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (!session.context.internalRoles.includes('founder_ceo')) {
    return <ConsentError title="Founder access required" detail="This OAuth endpoint can authorize the private Second Brain only for the founder account." />;
  }

  const supabase = await getServerSupabase();
  if (!supabase) redirect('/setup');

  const { data: authDetails, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !authDetails) {
    return <ConsentError title="Authorization request unavailable" detail={error?.message ?? 'The request is invalid or expired.'} />;
  }

  if (!('authorization_id' in authDetails)) redirect(authDetails.redirect_url);

  const scopes = authDetails.scope?.split(' ').filter(Boolean) ?? [];
  const clientName = authDetails.client?.name || 'AI client';

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 text-ink">
      <div className="w-full max-w-lg">
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">KSP Founder · OAuth</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight">Connect {clientName}?</h1>
          <p className="mt-2 text-[13px] leading-5 text-ink-3">
            This connection can authenticate as your founder account. The Second Brain still enforces founder-only authorization and Row Level Security on every MCP request.
          </p>
        </div>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">Client</p>
              <p className="mt-1 text-[13.5px] font-medium text-ink-2">{clientName}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">Redirect</p>
              <p className="mt-1 break-all text-[11.5px] leading-5 text-ink-3">{authDetails.redirect_uri}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">Requested scopes</p>
              {scopes.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {scopes.map((scope) => <code key={scope} className="rounded-md bg-surface-2 px-2 py-1 text-[10.5px] text-ink-2">{scope}</code>)}
                </div>
              ) : <p className="mt-1 text-[12px] text-ink-4">No additional identity scopes requested.</p>}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-line bg-surface-2 p-3 text-[11.5px] leading-5 text-ink-3">
            Approving does not give this client access to payments, production deploys, permission grants, or KSP Canon through the Founder MCP. Only the private Brain tool catalog is exposed.
          </div>

          <form action="/oauth/consent/decision" method="post" className="mt-5 flex gap-2">
            <input type="hidden" name="authorizationId" value={authorizationId} />
            <button name="decision" value="deny" className="flex-1 rounded-lg border border-line px-4 py-2.5 text-[13px] font-medium text-ink-2 hover:border-risk hover:text-risk">Deny</button>
            <button name="decision" value="approve" className="flex-1 rounded-lg bg-ink px-4 py-2.5 text-[13px] font-semibold text-canvas hover:bg-brand">Approve connection</button>
          </form>
        </section>
      </div>
    </main>
  );
}

function ConsentError({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-center">
        <h1 className="text-[20px] font-semibold">{title}</h1>
        <p className="mt-2 text-[13px] leading-5 text-ink-3">{detail}</p>
      </div>
    </main>
  );
}
