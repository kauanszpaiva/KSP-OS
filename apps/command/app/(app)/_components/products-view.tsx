'use client';

import { useState } from 'react';
import { BarChart, Donut, Reveal, Segmented } from '@ksp/ui';
import type { Product } from '@ksp/database';
import { EmptyState, Panel, SectionLabel } from './ui';
import { ProductActiveForm } from './growth-forms';
import { DeleteButton } from './crud-forms';
import { deleteProduct } from '../actions';

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((p) => (
            <Panel key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[14px] font-semibold text-ink">{p.name}</h3>
                {p.price_minor != null && <span className="tnum shrink-0 text-[13px] font-medium text-ink-2">{money(p.price_minor)}</span>}
              </div>
              {p.category && <p className="mt-1 text-[11.5px] uppercase tracking-wide text-ink-4">{p.category}</p>}
              {p.description && <p className="mt-2 line-clamp-2 text-[13px] text-ink-2">{p.description}</p>}
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <ProductActiveForm id={p.id} active={p.active} />
                <DeleteButton action={deleteProduct} id={p.id} label="Delete" iconOnly confirmText={`Delete product "${p.name}"?`} />
              </div>
            </Panel>
          ))}
        </div>
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
