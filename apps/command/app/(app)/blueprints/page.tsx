import Link from 'next/link';
import { Icon, ShapeMark, type IconName } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { formatDate } from '../../../lib/format';
import type { BlueprintView } from '@ksp/database';
import { getBlueprints } from '../blueprints-data';
import { PageHeader, StatStrip, type StatCardData } from '../_components/ui';

const KIND_META: Record<string, { label: string; icon: IconName; tone: 'brand' | 'good' | 'warn' | 'neutral' }> = {
  software: { label: 'Software', icon: 'software', tone: 'brand' },
  system: { label: 'System', icon: 'cpu', tone: 'brand' },
  process: { label: 'Process', icon: 'flow', tone: 'warn' },
  infrastructure: { label: 'Infrastructure', icon: 'cpu', tone: 'good' }
};

export default async function BlueprintsPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const blueprints = supabase ? await getBlueprints(supabase) : [];

  const active = blueprints.filter((b) => b.status === 'active');
  const byKind = (kind: string) => blueprints.filter((b) => b.kind === kind).length;
  const totalNodes = blueprints.reduce((sum, b) => sum + (b.canvas?.nodes?.length ?? 0), 0);

  const stats: StatCardData[] = [
    { icon: 'layers', label: 'Blueprints', value: blueprints.length, hint: 'Designs in the library', href: '/blueprints', tone: 'brand' },
    { icon: 'check-circle', label: 'Active', value: active.length, hint: 'Live and in use', href: '/blueprints', tone: active.length ? 'good' : 'neutral' },
    { icon: 'flow', label: 'Flowchart nodes', value: totalNodes, hint: 'Across all blueprints', href: '/blueprints' },
    { icon: 'software', label: 'Software designs', value: byKind('software'), hint: 'By kind: software', href: '/blueprints', tone: byKind('software') ? 'brand' : 'neutral' }
  ];

  const grouped = new Map<string | null, BlueprintView[]>();
  for (const blueprint of blueprints) {
    const key = blueprint.project_id;
    const bucket = grouped.get(key) ?? [];
    bucket.push(blueprint);
    grouped.set(key, bucket);
  }
  const groups = [...grouped.entries()].sort(([a], [b]) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return 0;
  });

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Control"
        title="Blueprints"
        description="Create, visualize and manage blueprints of software, systems and processes — each tied to a project, with interactive flowcharts."
        action={
          <Link
            href="/blueprints/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[13px] font-semibold text-on-brand shadow-card transition-[transform,filter] duration-fast hover:brightness-95 active:scale-[0.98] sm:rounded-lg"
          >
            <Icon name="plus" className="h-4 w-4" />
            New blueprint
          </Link>
        }
      />

      <StatStrip stats={stats} />

      {blueprints.length === 0 ? (
        <div className="animate-fade-in rounded-2xl border border-dashed border-line-2 bg-surface/60 px-4 py-12 text-center sm:rounded-xl">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-ink-3">
            <Icon name="layers" className="h-6 w-6" />
          </span>
          <p className="text-[15px] font-semibold text-ink">No blueprints yet.</p>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-3">
            Draft your first software, system or process design — attach it to a project and start drawing the flowchart.
          </p>
          <Link
            href="/blueprints/new"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[13px] font-semibold text-on-brand sm:rounded-lg"
          >
            <Icon name="plus" className="h-4 w-4" />
            Create the first blueprint
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([projectId, items]) => {
            const project = items[0].projectName;
            return (
              <section key={projectId ?? 'unassigned'} className="min-w-0">
                <div className="mb-3 flex items-center gap-2.5">
                  <ShapeMark shape={projectId ? 'square' : 'circle'} icon={projectId ? 'missions' : 'layers'} label={project ?? 'Unassigned'} tone={projectId ? 'brand' : 'neutral'} size="sm" />
                  <h2 className="truncate text-[13.5px] font-semibold text-ink-2">{project ?? 'Unassigned'}</h2>
                  <span className="tnum rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-ink-3">{items.length}</span>
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((blueprint) => {
                    const meta = KIND_META[blueprint.kind] ?? KIND_META.system;
                    const nodes = blueprint.canvas?.nodes?.length ?? 0;
                    const edges = blueprint.canvas?.edges?.length ?? 0;
                    return (
                      <Link
                        key={blueprint.id}
                        href={`/blueprints/${blueprint.id}`}
                        className="group relative min-w-0 overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-card transition-[border-color,transform] duration-fast hover:-translate-y-px hover:border-line-2 sm:rounded-xl"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.tone === 'good' ? 'bg-good-tint text-good' : meta.tone === 'warn' ? 'bg-warn-tint text-warn' : 'bg-brand-tint text-brand'}`}>
                            <Icon name={meta.icon} className="h-5 w-5" />
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize ${blueprint.status === 'active' ? 'bg-good-tint text-good' : blueprint.status === 'archived' ? 'bg-surface-2 text-ink-4' : 'bg-warn-tint text-warn'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${blueprint.status === 'active' ? 'bg-good' : blueprint.status === 'archived' ? 'bg-ink-4' : 'bg-warn'}`} aria-hidden />
                            {blueprint.status}
                          </span>
                        </div>
                        <h3 className="mt-3 truncate text-[14.5px] font-semibold text-ink">{blueprint.name}</h3>
                        <p className="mt-1 line-clamp-2 min-h-[2.3em] text-[12px] leading-[1.35] text-ink-3">
                          {blueprint.description || 'No description yet.'}
                        </p>
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                          <div className="flex items-center gap-3 text-[11px] text-ink-4">
                            <span className="inline-flex items-center gap-1">
                              <Icon name="grid" className="h-3.5 w-3.5" />
                              {nodes} nodes
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Icon name="flow" className="h-3.5 w-3.5" />
                              {edges} links
                            </span>
                          </div>
                          <span className="tnum text-[10.5px] text-ink-4">Edited {formatDate(blueprint.updated_at)}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
