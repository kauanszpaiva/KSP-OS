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

      <details className="mb-5 ml-auto w-fit rounded-xl border border-line bg-surface shadow-card">
        <summary className="flex min-h-10 cursor-pointer list-none items-center px-3 py-2 text-[12px] font-medium text-brand transition-colors duration-fast marker:hidden hover:bg-surface-2 sm:px-4 sm:text-[13px] [&::-webkit-details-marker]:hidden">
          + New product
        </summary>
        <div className="min-w-[min(88vw,420px)] animate-fade-slide-up border-t border-line p-4">
          <ProductForm />
        </div>
      </details>

      <ProductsView products={products} />
    </div>
  );
}
