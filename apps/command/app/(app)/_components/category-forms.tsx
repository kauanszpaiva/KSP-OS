'use client';

import { useActionState } from 'react';
import { createCategory, updateCategory, deleteCategory, type ActionResult } from '../actions';
import type { CategoryRef } from '../data';
import { DeleteButton } from './crud-forms';

const initial: ActionResult = { ok: false };

const ghostBtn =
  'rounded-lg border border-line-2 px-3 py-1.5 text-sm text-ink-2 transition-colors duration-fast hover:bg-brand-tint hover:text-brand disabled:opacity-50';
const inputCls =
  'min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none';

function FormError({ state }: { state: ActionResult }) {
  if (state.ok || !state.error) return null;
  return <span className="text-[12px] text-risk">{state.error}</span>;
}

function CategoryCreateForm() {
  const [state, action, pending] = useActionState(createCategory, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input name="name" placeholder="New category (e.g. Website, SEO, Retainer)" className={inputCls} required />
      <button type="submit" disabled={pending} className={ghostBtn}>
        {pending ? 'Adding…' : 'Add category'}
      </button>
      <FormError state={state} />
    </form>
  );
}

function CategoryRenameForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(updateCategory, initial);
  return (
    <form action={action} className="flex min-w-0 flex-1 items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input name="name" defaultValue={name} className={inputCls} required />
      <button type="submit" disabled={pending} className={ghostBtn}>
        {pending ? 'Saving…' : 'Rename'}
      </button>
      <FormError state={state} />
    </form>
  );
}

/**
 * Category management — create, rename (any internal member) and delete
 * (executive-only; DeleteButton surfaces the "Only executives can delete
 * records." message for others). Deleting a category leaves its missions and
 * tasks uncategorised rather than blocking, thanks to `on delete set null`.
 */
export function CategoryManager({ categories }: { categories: CategoryRef[] }) {
  return (
    <div className="space-y-3">
      <CategoryCreateForm />
      {categories.length === 0 ? (
        <p className="text-[12.5px] text-ink-4">No categories yet. Add one above to start tagging missions and tasks.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {categories.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <CategoryRenameForm id={c.id} name={c.name} />
              <DeleteButton
                action={deleteCategory}
                id={c.id}
                label="Delete category"
                iconOnly
                confirmText={`Delete category "${c.name}"? Missions and tasks keep existing but become uncategorised.`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
