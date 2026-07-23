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

      <ProductsView products={products} />
    </div>
  );
}
