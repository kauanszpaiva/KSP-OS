import { requireNetworkSession } from '../lib/network-session';
import { getServerSupabase } from '../lib/supabase';
import { respondToAssignment } from './actions';

export const dynamic = 'force-dynamic';

type Assignment = {
  id: string;
  title: string;
  status: string;
  starts_at: string | null;
  timezone: string;
  location: string | null;
  response_due_at: string | null;
  response_note: string | null;
  project_id: string | null;
  created_at: string;
};

function formatWhen(value: string | null, timezone: string) {
  if (!value) return 'Schedule pending';
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
}

export default async function NetworkHome() {
  const ctx = await requireNetworkSession();
  const supabase = await getServerSupabase();
  const { data } = supabase
    ? await supabase
        .from('partner_assignments')
        .select('id,title,status,starts_at,timezone,location,response_due_at,response_note,project_id,created_at')
        .eq('partner_organization_id', ctx.partnerOrganizationId)
        .order('starts_at', { ascending: true, nullsFirst: false })
        .limit(30)
    : { data: [] };

  const assignments = (data ?? []) as Assignment[];
  const open = assignments.filter((assignment) =>
    ['offered', 'clarification_requested'].includes(assignment.status)
  );
  const active = assignments.filter((assignment) =>
    ['accepted', 'in_progress', 'review'].includes(assignment.status)
  );

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">KSP Network</p>
            <h1 className="mt-1 text-xl font-semibold">Partner Operations</h1>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{ctx.partnerOrganizationName}</p>
            <p className="text-xs text-muted">
              {ctx.user.displayName} · {ctx.role.replaceAll('_', ' ')}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-xs text-muted">Needs response</p>
            <p className="mt-1 text-2xl font-semibold">{open.length}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-xs text-muted">In production</p>
            <p className="mt-1 text-2xl font-semibold">{active.length}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-xs text-muted">Security</p>
            <p className="mt-1 text-sm font-semibold">{ctx.mfa ? 'MFA verified' : 'Standard session'}</p>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3">
            <h2 className="text-base font-semibold">Assignments</h2>
            <p className="text-xs text-muted">Only work explicitly assigned to your partner organization appears here.</p>
          </div>
          <div className="space-y-3">
            {assignments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line-2 bg-surface p-6 text-sm text-muted">
                No assignments yet.
              </div>
            ) : (
              assignments.map((assignment) => (
                <article key={assignment.id} className="rounded-xl border border-line bg-surface p-4 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{assignment.title}</h3>
                        <span className="rounded-full border border-line-2 px-2 py-0.5 text-[11px] capitalize text-ink-3">
                          {assignment.status.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {formatWhen(assignment.starts_at, assignment.timezone)}
                        {assignment.location ? ` · ${assignment.location}` : ''}
                      </p>
                    </div>
                    {['offered', 'clarification_requested'].includes(assignment.status) && (
                      <div className="flex flex-wrap gap-2">
                        <form action={respondToAssignment}>
                          <input type="hidden" name="assignmentId" value={assignment.id} />
                          <input type="hidden" name="response" value="accepted" />
                          <button className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-on-brand">Accept</button>
                        </form>
                        <form action={respondToAssignment}>
                          <input type="hidden" name="assignmentId" value={assignment.id} />
                          <input type="hidden" name="response" value="clarification_requested" />
                          <button className="rounded-lg border border-line-2 px-3 py-2 text-xs font-medium">Ask clarification</button>
                        </form>
                        <form action={respondToAssignment}>
                          <input type="hidden" name="assignmentId" value={assignment.id} />
                          <input type="hidden" name="response" value="declined" />
                          <button className="rounded-lg border border-line-2 px-3 py-2 text-xs font-medium text-risk">Decline</button>
                        </form>
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <p className="mt-8 text-[11px] text-muted">
          Client information, KSP financials and unrelated projects are not exposed in KSP Network. Final client publication remains a KSP-only action.
        </p>
      </div>
    </main>
  );
}
