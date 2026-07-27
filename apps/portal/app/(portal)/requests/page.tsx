import { Badge, Card, EmptyState, Reveal } from '@ksp/ui';
import { requirePortalSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getClientMeetings, getClientRequests, getPublishedProjects, getRequestComments, getRequestStatusHistory, latestPerProject } from '../data';
import { formatDateTime } from '../../../lib/format';
import { NewRequestForm } from './_components/new-request-form';
import { RequestRow } from './_components/request-row';
import type { SupabaseClient } from '@ksp/database';

const MEETING_TONE: Record<string, 'brand' | 'good' | 'neutral'> = { scheduled: 'brand', completed: 'good', cancelled: 'neutral' };

export default async function PortalRequestsPage() {
  await requirePortalSession();
  const supabase = await getServerSupabase();

  const [requests, publications, meetings] = supabase
    ? await Promise.all([getClientRequests(supabase), getPublishedProjects(supabase), getClientMeetings(supabase)])
    : [[], [], []];
  const projects = latestPerProject(publications)
    .filter((p): p is typeof p & { project_id: string } => p.project_id !== null)
    .map((p) => ({ id: p.project_id, title: p.title }));

  const detail = supabase
    ? await Promise.all(
        requests.map(async (r) => {
          const client = supabase as SupabaseClient;
          const [comments, history] = await Promise.all([getRequestComments(client, r.id), getRequestStatusHistory(client, r.id)]);
          return { request: r, comments, history };
        })
      )
    : [];

  return (
    <div className="space-y-9">
      <Reveal className="border-l-2 border-brand pl-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">Meetings &amp; Requests</p>
        <h1 className="mt-1 font-display text-[24px] font-semibold text-ink">Your meetings &amp; requests</h1>
        <p className="mt-2 max-w-2xl text-[14px] text-ink-2">Your scheduled meetings with KSP, and any requests you&rsquo;ve sent.</p>
      </Reveal>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Scheduled meetings</p>
        {meetings.length === 0 ? (
          <EmptyState icon="inbox" title="Nothing scheduled." hint="Meetings KSP schedules with you will appear here." />
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {meetings.map((m) => (
              <div key={m.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className={`truncate text-[14px] font-medium ${m.status === 'cancelled' ? 'text-ink-4 line-through' : 'text-ink'}`}>{m.title}</p>
                  <Badge tone={MEETING_TONE[m.status] ?? 'neutral'}>{m.status}</Badge>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
                  <span className="tnum">{formatDateTime(m.scheduled_at)}</span>
                  {m.duration_minutes != null && <span>· {m.duration_minutes} min</span>}
                  {m.location && <span>· {m.location}</span>}
                </p>
                {m.agenda && <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">{m.agenda}</p>}
              </div>
            ))}
          </Card>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">New request</p>
          <NewRequestForm projects={projects} />
        </div>

        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Your requests</p>
          {detail.length === 0 ? (
            <EmptyState icon="inbox" title="No requests yet." hint="Requests you submit to KSP will show up here." />
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {detail.map(({ request, comments, history }) => (
                <RequestRow key={request.id} request={request} comments={comments} history={history} />
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
