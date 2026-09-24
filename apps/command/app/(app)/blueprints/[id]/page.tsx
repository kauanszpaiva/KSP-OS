import { notFound } from 'next/navigation';
import { requireSession } from '../../../../lib/session';
import { getServerSupabase } from '../../../../lib/supabase';
import { getBlueprint } from '../../blueprints-data';
import { BlueprintEditor } from '../_components/blueprint-editor';

export const dynamic = 'force-dynamic';

export default async function BlueprintEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession();
  const supabase = await getServerSupabase();
  const blueprint = supabase ? await getBlueprint(supabase, id) : null;
  if (!blueprint) notFound();

  return (
    <div className="min-w-0">
      <BlueprintEditor
        blueprintId={blueprint.id}
        initialCanvas={blueprint.canvas}
        initialStatus={blueprint.status}
        initialName={blueprint.name}
      />
    </div>
  );
}
