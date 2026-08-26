import { redirect } from 'next/navigation';
import { Card } from '@ksp/ui';
import { getAuthContext, isKspIncOwner } from '@ksp/auth';
import { getServerSupabase } from '../../lib/supabase';
import { listPortalViewAsTargets } from '../../lib/view-as';
import { startPortalViewAs } from './actions';

export const dynamic = 'force-dynamic';

export default async function PortalViewAsPage() {
  const supabase = await getServerSupabase();
  if (!supabase) redirect('/setup');
  const ctx = await getAuthContext(supabase);
  if (!ctx) redirect('/login');
  if (!isKspIncOwner(ctx)) redirect('/no-access');

  const targets = await listPortalViewAsTargets(supabase);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-7 border-l-2 border-brand pl-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">KSP INC · Portal QA</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">View as client</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-2">
          Preview the Portal using a client identity's active workspace, project and permission scope. Your KSP identity remains the audited actor and the preview is read-only.
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        {targets.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-ink">No active client identities available.</p>
            <p className="mt-1 text-[13px] text-ink-3">Create or reactivate a Portal membership before starting a preview.</p>
          </div>
        ) : (
          <form action={startPortalViewAs} className="space-y-5">
            <div>
              <label htmlFor="target" className="mb-1.5 block text-[12px] font-semibold text-ink">Client identity</label>
              <select id="target" name="target" required className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">
                <option value="">Select a client and user</option>
                {targets.map((target) => (
                  <option key={`${target.profileId}:${target.clientOrganizationId}`} value={`${target.profileId}:${target.clientOrganizationId}`}>
                    {target.clientName} — {target.displayName} ({target.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="reason" className="mb-1.5 block text-[12px] font-semibold text-ink">Reason</label>
              <input id="reason" name="reason" required minLength={4} maxLength={240} defaultValue="Client experience QA" className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
              <p className="mt-1.5 text-[11.5px] text-ink-3">Recorded in the audit trail. Preview expires automatically after 15 minutes.</p>
            </div>

            <button type="submit" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-canvas transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2">
              Start read-only preview
            </button>
          </form>
        )}
      </Card>
    </main>
  );
}
