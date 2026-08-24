'use client';

import { useState } from 'react';
import { BarChart, Donut, Reveal, Segmented, ShapeMark } from '@ksp/ui';
import type { Product } from '@ksp/database';
import { EmptyState, Panel, SectionLabel } from './ui';
import { ProductActiveForm } from './growth-forms';
import { DeleteButton } from './crud-forms';
import { deleteProduct } from '../actions';
import { ProgressiveList } from './progressive-list';

function money(minor: number): string {
  return (minor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function GridView({ products }: { products: Product[] }) {
  const active = products.filter((p) => p.active);
  const archived = products.filter((p) => !p.active);
  return (
    <div className="space-y-8">
      <Reveal>
        <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{active.length}</span>}>Active</SectionLabel>
        <Panel className="overflow-hidden">
          <ProgressiveList initial={5}>{active.map((p) => (
            <details key={p.id} className="group border-t border-line first:border-t-0 open:bg-canvas/55">
              <summary className="grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 marker:hidden sm:px-4 [&::-webkit-details-marker]:hidden">
                <ShapeMark shape="diamond" icon="products" label={p.category || 'Product'} tone="accent" size="sm" />
                <div className="min-w-0"><h3 className="truncate text-[14px] font-semibold text-ink">{p.name}</h3><p className="mt-0.5 truncate text-[11.5px] capitalize text-ink-3">{p.category || 'Uncategorized'}</p></div>
                {p.price_minor != null && <span className="tnum shrink-0 text-[12px] font-medium text-ink-2">{money(p.price_minor)}</span>}
              </summary>
              <div className="border-t border-line px-4 py-3">
                {p.description && <p className="mb-3 text-[12.5px] leading-relaxed text-ink-2">{p.description}</p>}
                <div className="flex items-center justify-between">
                <ProductActiveForm id={p.id} active={p.active} />
                <DeleteButton action={deleteProduct} id={p.id} label="Delete" iconOnly confirmText={`Delete product "${p.name}"?`} />
                </div>
              </div>
            </details>
          ))}</ProgressiveList>
        </Panel>
      </Reveal>

      {archived.length > 0 && (
        <Reveal delay={60}>
          <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{archived.length}</span>}>Archived</SectionLabel>
          <Panel className="divide-y divide-line">
            {archived.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <span className="truncate text-[13.5px] font-medium text-ink-2">{p.name}</span>
                <div className="flex items-center gap-1">
                  <ProductActiveForm id={p.id} active={p.active} />
                  <DeleteButton action={deleteProduct} id={p.id} label="Delete" iconOnly confirmText={`Delete product "${p.name}"?`} />
                </div>
              </div>
            ))}
          </Panel>
        </Reveal>
      )}
    </div>
  );
}

function ChartView({ products }: { products: Product[] }) {
  const active = products.filter((p) => p.active);
  const archived = products.filter((p) => !p.active);

  const byCategory = new Map<string, number>();
  for (const p of products) {
    const key = p.category ?? 'Uncategorized';
    byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
  }
  const barData = Array.from(byCategory.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <Reveal>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Catalog by category</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <BarChart data={barData} />
        </div>
      </Reveal>
      <Reveal delay={60}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Active vs. archived</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <Donut
            segments={[
              { label: 'Active', value: active.length, tone: 'brand' },
              { label: 'Archived', value: archived.length, tone: 'neutral' }
            ]}
          />
        </div>
      </Reveal>
    </div>
  );
}

export function ProductsView({ products }: { products: Product[] }) {
  const [view, setView] = useState<'grid' | 'chart'>('grid');

  if (products.length === 0) {
    return <EmptyState icon="products" title="No products yet." hint="Add the first offer to build a reusable catalog." />;
  }

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'grid', label: 'Grid' },
            { value: 'chart', label: 'Chart' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'grid' | 'chart')}
        />
      </div>
      {view === 'grid' ? <GridView products={products} /> : <ChartView products={products} />}
    </div>
  );
}
