import { notFound } from "next/navigation";
import { IncShell, ownerRoleLabel } from "../../../components/inc-shell";
import { getBlueprint } from "../../../lib/blueprints-data";
import { requireIncOwner } from "../../../lib/inc-session";
import { getServerSupabase } from "../../../lib/supabase";
import { IncBlueprintEditor } from "../_components/inc-blueprint-editor";

export const dynamic = "force-dynamic";

export default async function IncBlueprintEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const blueprint = supabase ? await getBlueprint(supabase, id) : null;
  if (!blueprint) notFound();

  return (
      <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
        <IncBlueprintEditor
          blueprintId={blueprint.id}
        initialCanvas={blueprint.canvas}
        initialStatus={blueprint.status}
        initialName={blueprint.name}
      />
    </IncShell>
  );
}
