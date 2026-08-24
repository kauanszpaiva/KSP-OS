import { Badge, Card, EmptyState, Reveal, ShapeMark } from '@ksp/ui';
import { requirePortalSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getClientMeetings, getClientRequests, getPublishedProjects, getRequestComments, getRequestStatusHistory, latestPerProject } from '../data';
import { formatDateTime } from '../../../lib/format';
import { NewRequestForm } from './_components/new-request-form';
import { RequestRow } from './_components/request-row';
import type { SupabaseClient } from '@ksp/database';
import { ProgressiveList } from '../_components/progressive-list';

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
          <Card className="overflow-hidden">
            <ProgressiveList initial={3}>{meetings.map((m) => (
              <details key={m.id} className="group border-t border-line first:border-t-0">
                <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <ShapeMark shape="diamond" icon="schedule" label="Meeting" tone={m.status === 'completed' ? 'good' : 'accent'} size="sm" />
                  <div className="min-w-0">
                    <p className={`truncate text-[14px] font-medium ${m.status === 'cancelled' ? 'text-ink-4 line-through' : 'text-ink'}`}>{m.title}</p>
                    <p className="truncate text-[12px] text-ink-3">{formatDateTime(m.scheduled_at)}{m.duration_minutes != null ? ` · ${m.duration_minutes} min` : ''}</p>
                  </div>
                  <Badge tone={MEETING_TONE[m.status] ?? 'neutral'}>{m.status}</Badge>
                </summary>
                {(m.location || m.agenda) && <div className="border-t border-line bg-surface px-4 py-3 text-[13px] text-ink-2">{m.location && <p className="font-medium">{m.location}</p>}{m.agenda && <p className="mt-1">{m.agenda}</p>}</div>}
              </details>
            ))}</ProgressiveList>
          </Card>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">New request</p>
          <details className="rounded-xl border border-line bg-surface shadow-card">
            <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-semibold text-brand">+ Start a request</summary>
            <div className="border-t border-line p-4"><NewRequestForm projects={projects} embedded /></div>
          </details>
        </div>

        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Your requests</p>
          {detail.length === 0 ? (
            <EmptyState icon="inbox" title="No requests yet." hint="Requests you submit to KSP will show up here." />
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              <ProgressiveList initial={4}>{detail.map(({ request, comments, history }) => (
                <RequestRow key={request.id} request={request} comments={comments} history={history} />
              ))}</ProgressiveList>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
