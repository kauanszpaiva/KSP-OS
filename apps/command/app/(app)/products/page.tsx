import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getProducts } from '../data';
import { EmptyState, PageHeader, Panel, SectionLabel } from '../_components/ui';
import { ProductActiveForm, ProductForm } from '../_components/growth-forms';

function money(minor: number): string {
  return (minor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default async function ProductsPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const products = supabase ? await getProducts(supabase) : [];

  const active = products.filter((p) => p.active);
  const archived = products.filter((p) => !p.active);

  return (
    <div>
      <PageHeader eyebrow="Growth" title="Products" description="The catalog of offers and services — feeds pricing and proposals." />

      <details className="mb-6 rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          + New product
        </summary>
        <div className="animate-fade-slide-up border-t border-line p-4">
          <ProductForm />
        </div>
      </details>

      {products.length === 0 ? (
        <EmptyState icon="products" title="No products yet." hint="Add the first offer to build a reusable catalog." />
      ) : (
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
                  <div className="mt-3 border-t border-line pt-3">
                    <ProductActiveForm id={p.id} active={p.active} />
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
                    <ProductActiveForm id={p.id} active={p.active} />
                  </div>
                ))}
              </Panel>
            </Reveal>
          )}
        </div>
      )}
    </div>
  );
}
