import Link from 'next/link';
import {
  ActivityStrip,
  DataUnavailable,
  DonutChart,
  Meter,
  StatCard,
  StatGrid,
  StatusPill,
  VizPanel,
  VisualEmpty,
  VisualGrid,
  bucketByDay,
  distribution,
  isPastDue,
  ratioOf,
  stagger
} from '@ksp/ui';
import { requireEffectiveNetworkSession } from '../lib/network-session';
import { getServerSupabase } from '../lib/supabase';
import { respondToAssignment } from './actions';
import { stopNetworkViewAs } from './view-as/actions';

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

/**
 * Status families this surface reasons about. Every count on the dashboard below
 * is derived from the assignment rows the partner query already returned —
 * nothing is estimated and an empty window charts nothing.
 */
const OFFERED = ['offered', 'clarification_requested'];
const IN_PRODUCTION = ['accepted', 'in_progress', 'review'];
const DONE = ['completed', 'delivered'];
const SCHEDULE_DAYS = 14;

function isUpcoming(value: string | null, now: Date): boolean {
  if (!value) return false;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) && parsed >= now.getTime();
}

export default async function NetworkHome() {
  const session = await requireEffectiveNetworkSession();
  const ctx = session.context;

  if (!ctx) {
    return (
      <main className="min-h-screen bg-canvas text-ink">
        <header className="border-b border-line bg-surface px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
                KSP Network
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold">Owner access</h1>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{session.actor.displayName}</p>
              <p className="text-xs text-muted">KSP INC owner</p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
              Global owner mode
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Inspect Network without becoming a partner.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Your founder identity is authenticated against KSPCENTER. Choose a
              real active partner identity to preview exactly what that partner
              can see. The preview is read-only, audited, and expires
              automatically.
            </p>
            <Link
              href="/view-as"
              className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand"
            >
              View as partner
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const supabase = await getServerSupabase();
  const { data } = supabase
    ? await supabase
        .from('partner_assignments')
        .select(
          'id,title,status,starts_at,timezone,location,response_due_at,response_note,project_id,created_at'
        )
        .eq('partner_organization_id', ctx.partnerOrganizationId)
        .order('starts_at', { ascending: true, nullsFirst: false })
        .limit(30)
    : { data: [] };

  const assignments = (data ?? []) as Assignment[];
  const now = new Date();
  const open = assignments.filter((assignment) => OFFERED.includes(assignment.status));
  const active = assignments.filter((assignment) => IN_PRODUCTION.includes(assignment.status));
  const done = assignments.filter((assignment) => DONE.includes(assignment.status));

  const statusMix = distribution(assignments.map((assignment) => assignment.status), {
    limit: 6,
    otherLabel: 'Other statuses'
  });
  const schedule = bucketByDay(
    assignments.map((assignment) => assignment.starts_at),
    SCHEDULE_DAYS,
    now
  );
  const scheduled = assignments.filter((assignment) => Boolean(assignment.starts_at)).length;
  const outstandingResponses = open.filter((assignment) =>
    isPastDue(assignment.response_due_at, 'open', now)
  ).length;
  const upcoming = assignments.filter((assignment) => isUpcoming(assignment.starts_at, now)).slice(0, 5);
  const resolved = assignments.length - open.length;
  const acceptanceRate = ratioOf(active.length + done.length, resolved);

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
              KSP Network
            </p>
            <h1 className="mt-1 font-display text-xl font-semibold">Partner Operations</h1>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{ctx.partnerOrganizationName}</p>
              <p className="text-xs text-ink-3">
                {ctx.user.displayName} · {ctx.role.replaceAll('_', ' ')}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[10.5px] font-semibold text-ink-3">
              {session.viewAs ? 'Read-only preview' : ctx.mfa ? 'MFA verified' : 'Standard session'}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {session.viewAs ? (
          <div
            role="status"
            className="mb-5 flex flex-col gap-3 rounded-xl border border-warn/40 bg-warn-tint px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-warn">
                Read-only · View As
              </p>
              <p className="mt-0.5 truncate text-[13px] font-semibold text-ink">
                {session.viewAs.partnerOrganizationName} —{' '}
                {session.viewAs.displayName}
              </p>
              <p className="mt-0.5 text-[11.5px] text-ink-3">
                Audited actor: {session.actor.displayName} · expires{' '}
                {new Date(session.viewAs.expiresAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <form action={stopNetworkViewAs}>
              <button
                type="submit"
                className="min-h-10 rounded-lg border border-line bg-surface px-3 py-2 text-[12px] font-semibold text-ink hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                Exit View As
              </button>
            </form>
          </div>
        ) : session.owner ? (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
                KSP INC owner mode
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-2">
                You also have a natural partner membership. Use View As only for
                another partner identity.
              </p>
            </div>
            <Link
              href="/view-as"
              className="shrink-0 rounded-lg bg-ink px-3 py-2 text-[12px] font-semibold text-canvas"
            >
              View as
            </Link>
          </div>
        ) : null}

        <StatGrid>
          <StatCard
            icon="inbox"
            index={0}
            label="Needs your response"
            note="Offers and clarification requests in this window"
            tone={open.length > 0 ? 'warn' : 'good'}
            value={open.length}
          />
          <StatCard
            icon="missions"
            index={1}
            label="In production"
            note="Accepted work currently with this partner"
            tone="brand"
            value={active.length}
          />
          <StatCard
            icon="check"
            index={2}
            label="Completed"
            note="Delivered and closed assignments"
            tone="good"
            value={done.length}
          />
          <StatCard
            icon="schedule"
            index={3}
            label="Assignments in window"
            note="Most recent 30 ordered by start date"
            value={assignments.length}
          />
        </StatGrid>

        <VisualGrid className="mt-5">
          <VizPanel
            index={0}
            note="Every status token returned to this partner organization"
            title="Assignment status"
          >
            <DonutChart
              caption="Share of returned assignments by status"
              centerLabel="assignments"
              centerValue={String(assignments.length)}
              empty="No assignments are visible to this partner organization yet."
              items={statusMix}
            />
          </VizPanel>

          <VizPanel
            index={1}
            note={`Start dates bucketed per UTC day · last ${SCHEDULE_DAYS} days`}
            title="Schedule load"
          >
            {scheduled === 0 ? (
              <VisualEmpty>
                No returned assignment carries a start date, so no schedule load can be shown.
              </VisualEmpty>
            ) : (
              <ActivityStrip
                buckets={schedule}
                caption={`Assignments starting per day (${scheduled} of ${assignments.length} rows are dated)`}
              />
            )}
          </VizPanel>

          <VizPanel
            index={2}
            note="Derived from the returned window, not from the whole table"
            title="Response discipline"
          >
            <div className="grid gap-4">
              <Meter
                detail={`${open.length} of ${assignments.length} returned assignments are still awaiting a partner decision.`}
                index={0}
                label="Awaiting your decision"
                max={Math.max(assignments.length, 1)}
                tone={open.length > 0 ? 'warn' : 'good'}
                value={open.length}
              />
              <Meter
                detail={
                  outstandingResponses > 0
                    ? `${outstandingResponses} offer${outstandingResponses === 1 ? '' : 's'} passed the recorded response due date.`
                    : 'No returned offer is past its response due date.'
                }
                index={1}
                label="Past the response due date"
                max={Math.max(assignments.length, 1)}
                tone={outstandingResponses > 0 ? 'risk' : 'good'}
                value={outstandingResponses}
              />
              <Meter
                detail={`${Math.round(acceptanceRate * 100)}% of the ${resolved} answered assignments moved into production or completion.`}
                index={2}
                label="Answered into production"
                max={1}
                tone="good"
                value={acceptanceRate}
              />
            </div>
          </VizPanel>

          <VizPanel index={3} note="Next start dates in this window" title="Upcoming schedule">
            {upcoming.length === 0 ? (
              <VisualEmpty>Nothing in this window has a future start date.</VisualEmpty>
            ) : (
              <ul className="grid gap-2.5">
                {upcoming.map((assignment) => (
                  <li className="flex min-w-0 items-start justify-between gap-3" key={assignment.id}>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-ink">{assignment.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-ink-3">
                        {formatWhen(assignment.starts_at, assignment.timezone)}
                        {assignment.location ? ` · ${assignment.location}` : ''}
                      </p>
                    </div>
                    <StatusPill label={assignment.status.replaceAll('_', ' ')} />
                  </li>
                ))}
              </ul>
            )}
          </VizPanel>
        </VisualGrid>

        {assignments.length === 0 ? (
          <div className="mt-5">
            <DataUnavailable
              label="No assignments returned"
              reason="This partner organization has no assignment rows in the current window. Nothing is charted rather than shown as zero."
            />
          </div>
        ) : null}

        <section className="mt-6">
          <div className="mb-3">
            <h2 className="font-display text-base font-semibold">Assignments</h2>
            <p className="text-xs text-ink-3">
              Only work explicitly assigned to this partner organization appears
              here.
            </p>
          </div>
          <div className="space-y-3">
            {assignments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line-2 bg-surface p-6 text-sm text-ink-3">
                No assignments yet.
              </div>
            ) : (
              assignments.map((assignment, index) => (
                <article
                  key={assignment.id}
                  className="animate-fade-slide-up rounded-xl border border-line bg-surface p-4 shadow-card motion-reduce:animate-none"
                  style={stagger(index, 30)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{assignment.title}</h3>
                        <StatusPill label={assignment.status.replaceAll('_', ' ')} />
                        {open.includes(assignment) &&
                        isPastDue(assignment.response_due_at, assignment.status, now) ? (
                          <StatusPill label="Response overdue" tone="risk" />
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-ink-3">
                        {formatWhen(assignment.starts_at, assignment.timezone)}
                        {assignment.location
                          ? ` · ${assignment.location}`
                          : ''}
                        {assignment.response_due_at
                          ? ` · respond by ${formatWhen(assignment.response_due_at, assignment.timezone)}`
                          : ''}
                      </p>
                      {assignment.response_note ? (
                        <p className="mt-1 text-xs text-ink-3">{assignment.response_note}</p>
                      ) : null}
                    </div>
                    {!session.viewAs &&
                      OFFERED.includes(
                        assignment.status
                      ) && (
                        <div className="flex flex-wrap gap-2">
                          <form action={respondToAssignment}>
                            <input
                              type="hidden"
                              name="assignmentId"
                              value={assignment.id}
                            />
                            <input
                              type="hidden"
                              name="response"
                              value="accepted"
                            />
                            <button className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-on-brand">
                              Accept
                            </button>
                          </form>
                          <form action={respondToAssignment}>
                            <input
                              type="hidden"
                              name="assignmentId"
                              value={assignment.id}
                            />
                            <input
                              type="hidden"
                              name="response"
                              value="clarification_requested"
                            />
                            <button className="rounded-lg border border-line-2 px-3 py-2 text-xs font-medium">
                              Ask clarification
                            </button>
                          </form>
                          <form action={respondToAssignment}>
                            <input
                              type="hidden"
                              name="assignmentId"
                              value={assignment.id}
                            />
                            <input
                              type="hidden"
                              name="response"
                              value="declined"
                            />
                            <button className="rounded-lg border border-line-2 px-3 py-2 text-xs font-medium text-risk">
                              Decline
                            </button>
                          </form>
                        </div>
                      )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <p className="mt-8 text-[11px] text-ink-4">
          Client information, KSP financials and unrelated projects are not
          exposed in KSP Network. Final client publication remains a KSP-only
          action.
        </p>
      </div>
    </main>
  );
}
