import Link from 'next/link';
import { Icon } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { PageHeader, Panel, SectionLabel, Figure } from '../_components/ui';
import { getTasks, getMissions, getCommitments } from '../data';

const deliveryLanes = [
  {
    title: 'Systems & Software',
    description: 'Coordinate the technical delivery queue and keep implementation evidence connected to the work.',
    href: '/software',
    icon: 'software' as const,
    state: 'Live'
  },
  {
    title: 'Business Consulting',
    description: 'Run consulting work through Missions and Workspace today while the dedicated engagement workflow is built.',
    href: '/missions',
    icon: 'knowledge' as const,
    state: 'Shared kernel'
  },
  {
    title: 'Marketing & Media',
    description: 'Coordinate campaigns, content readiness, publishing dates, and the current production workflow.',
    href: '/content',
    icon: 'content' as const,
    state: 'Live'
  }
];

const sharedSurfaces = [
  { label: 'Missions', href: '/missions', description: 'Client engagements, campaigns, products, and bounded outcomes.' },
  { label: 'Workspace', href: '/workspace', description: 'The shared work-item execution surface across delivery lines.' },
  { label: 'Schedule', href: '/schedule', description: 'Deadlines and time-bound delivery commitments.' }
];

export default async function DeliveryPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error('Supabase required');

  const [tasks, missions, commitments] = await Promise.all([
    getTasks(supabase),
    getMissions(supabase),
    getCommitments(supabase)
  ]);

  const activeMissions = missions.filter((m) => m.status === 'active');
  const upcomingCommitments = commitments.filter((c) => c.state !== 'completed' && c.due_date && new Date(c.due_date) >= new Date());
  const blockedTasks = tasks.filter((t) => t.blocked);
  const reviewTasks = tasks.filter((t) => t.status === 'pending_approval' || t.status === 'draft'); // Using draft/pending as generic reviews here

  return (
    <div>
      <PageHeader
        eyebrow="Delivery"
        title="Delivery Operations Hub"
        description="Cross-service operational visibility and execution surfaces."
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 mb-8">
        <Panel className="p-5 flex flex-col justify-between">
          <SectionLabel>Active Work Packages</SectionLabel>
          <div className="flex flex-col gap-4">
            <Link href="/missions" className="hover:opacity-80 transition-opacity">
              <Figure label="Active Missions" value={activeMissions.length} tone="brand" suffix=" (real)" />
            </Link>
          </div>
        </Panel>

        <Panel className="p-5 flex flex-col justify-between">
          <SectionLabel>Milestones & Schedule</SectionLabel>
          <div className="flex flex-col gap-4">
            <Link href="/commitments" className="hover:opacity-80 transition-opacity">
              <Figure label="Upcoming Deadlines" value={upcomingCommitments.length} suffix=" (real)" />
            </Link>
          </div>
        </Panel>

        <Panel className="p-5 flex flex-col justify-between">
          <SectionLabel>Review & Approval</SectionLabel>
          <div className="flex flex-col gap-4">
            <Link href="/workspace" className="hover:opacity-80 transition-opacity">
              <Figure label="Review Queues" value={reviewTasks.length} tone={reviewTasks.length > 0 ? 'warn' : 'neutral'} suffix=" (calc)" />
            </Link>
          </div>
        </Panel>

        <Panel className="p-5 flex flex-col justify-between">
          <SectionLabel>Bottlenecks</SectionLabel>
          <div className="flex flex-col gap-4">
            <Link href="/workspace" className="hover:opacity-80 transition-opacity">
               <Figure label="Blocked Tasks" value={blockedTasks.length} tone={blockedTasks.length > 0 ? 'risk' : 'neutral'} suffix=" (real)" />
            </Link>
          </div>
        </Panel>
      </div>

      <div className="mb-8 grid gap-4 xl:grid-cols-3">
        {deliveryLanes.map((lane) => (
          <Link key={lane.title} href={lane.href} className="group rounded-xl border border-line bg-surface p-5 shadow-card transition-all duration-fast hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-hover">
            <div className="mb-5 flex items-start justify-between gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface-2 text-brand">
                <Icon name={lane.icon} className="h-5 w-5" />
              </span>
              <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{lane.state}</span>
            </div>
            <h2 className="text-[16px] font-semibold text-ink">{lane.title}</h2>
            <p className="mt-2 text-[13px] leading-5 text-muted">{lane.description}</p>
            <p className="mt-5 text-[12px] font-medium text-brand">Open workspace →</p>
          </Link>
        ))}
      </div>

      <section className="rounded-xl border border-line bg-surface shadow-card">
        <div className="border-b border-line px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Shared delivery kernel</p>
          <h2 className="mt-1 text-[15px] font-semibold text-ink">Common execution surfaces</h2>
        </div>
        <div className="divide-y divide-line">
          {sharedSurfaces.map((surface) => (
            <Link key={surface.href} href={surface.href} className="flex items-center justify-between gap-5 px-5 py-4 transition-colors duration-fast hover:bg-surface-2">
              <div>
                <p className="text-[13px] font-medium text-ink">{surface.label}</p>
                <p className="mt-1 text-[12px] text-muted">{surface.description}</p>
              </div>
              <span className="text-brand">→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
