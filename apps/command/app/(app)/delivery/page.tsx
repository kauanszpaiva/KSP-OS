import Link from 'next/link';
import { Icon } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { PageHeader } from '../_components/ui';

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

  return (
    <div>
      <PageHeader
        eyebrow="Delivery"
        title="Delivery Overview"
        description="One operating layer for KSP client delivery across systems, consulting, marketing, and media."
      />

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
