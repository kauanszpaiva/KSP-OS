import { requireSession } from '../../../../lib/session';
import { getServerSupabase } from '../../../../lib/supabase';
import { getBlueprintProjects } from '../../blueprints-data';
import { NewBlueprintForm } from '../_components/new-blueprint-form';

export default async function NewBlueprintPage() {
  await requireSession();
  const supabase = await getServerSupabase();
  const projects = supabase ? await getBlueprintProjects(supabase) : [];

  return (
    <div className="mx-auto min-w-0 max-w-4xl">
      <header className="mb-6 border-b border-line pb-5">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-4">Control</p>
        <h1 className="font-display text-[28px] font-semibold leading-[1.08] text-ink md:text-[30px]">New blueprint</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-[1.5] text-ink-3">
          Name it, pick a project, and you will land in the interactive flowchart editor.
        </p>
      </header>
      <NewBlueprintForm projects={projects} />
    </div>
  );
}
