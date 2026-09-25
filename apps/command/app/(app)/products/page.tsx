import { DistributionBars, DonutChart, Meter, VizBoard, VizPanel, VisualEmpty, VisualGrid, distribution } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getProducts } from '../data';
import { PageHeader } from '../_components/ui';
import { ProductForm } from '../_components/growth-forms';
import { ProductsView } from '../_components/products-view';

export default async function ProductsPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const products = supabase ? await getProducts(supabase) : [];

  const activeMix = distribution(products.map((product) => (product.active ? 'Active' : 'Inactive')));
  const categoryMix = distribution(products.map((product) => product.category), {
    limit: 6,
    otherLabel: 'Other categories'
  });
  const currencyMix = distribution(products.map((product) => product.currency), {
    limit: 6,
    otherLabel: 'Other currencies'
  });
  const priced = products.filter((product) => product.price_minor !== null).length;

  return (
    <div>
      <PageHeader eyebrow="Growth" title="Products" description="The catalog of offers and services — feeds pricing and proposals." />

      <details className="mb-5 ml-auto w-fit rounded-xl border border-line bg-surface shadow-card">
        <summary className="flex min-h-10 cursor-pointer list-none items-center px-3 py-2 text-[12px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 sm:px-4 sm:text-[13px] [&::-webkit-details-marker]:hidden">
          + New product
        </summary>
        <div className="min-w-[min(88vw,420px)] animate-fade-slide-up border-t border-line p-4">
          <ProductForm />
        </div>
      </details>

      <VizBoard
        aside={`${products.length} product${products.length === 1 ? '' : 's'}`}
        className="mb-5"
        note="Derived from the catalog records this page already loaded"
        title="Catalog board"
      >
        <VisualGrid>
          <VizPanel index={0} note="active flag recorded on each product" title="Catalog state">
            <DonutChart
              caption="Share of products by catalog state"
              centerLabel="products"
              centerValue={String(products.length)}
              empty="No product was returned."
              items={activeMix}
            />
          </VizPanel>

          <VizPanel index={1} note="category recorded on each product" title="Category mix">
            <DistributionBars empty="No product was returned." items={categoryMix} tone="scale" />
          </VizPanel>

          <VizPanel index={2} note="Currency recorded on each price — prices are never totalled across currencies" title="Recorded currency">
            <DistributionBars empty="No product was returned." items={currencyMix} tone="scale" />
          </VizPanel>

          <VizPanel index={3} note="A product without a price cannot feed pricing or a proposal" title="Pricing coverage">
            {products.length > 0 ? (
              <Meter
                detail={`${priced} of ${products.length} products carry a price_minor.`}
                label="With a recorded price"
                max={products.length}
                tone={priced === products.length ? 'good' : 'warn'}
                value={priced}
              />
            ) : (
              <VisualEmpty>No product was returned, so no pricing coverage is shown.</VisualEmpty>
            )}
          </VizPanel>
        </VisualGrid>
      </VizBoard>

      <ProductsView products={products} />
    </div>
  );
}
