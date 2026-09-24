import { IncShell, ownerRoleLabel } from "../../../components/inc-shell";
import { getBlueprintProjects } from "../../../lib/blueprints-data";
import { requireIncOwner } from "../../../lib/inc-session";
import { getServerSupabase } from "../../../lib/supabase";
import { NewBlueprintForm } from "../_components/new-blueprint-form";

export default async function IncNewBlueprintPage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const projects = supabase ? await getBlueprintProjects(supabase) : [];

  return (
      <IncShell ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
        <section className="ownerHero">
          <div>
            <div className="eyebrow">Design &amp; architecture</div>
            <h1>New blueprint</h1>
          <p>Name it, pick a project, and you will land in the interactive flowchart editor.</p>
        </div>
      </section>
      <section className="section">
        <div className="sectionHeader">
          <h2>Blueprint details</h2>
          <p>Fields are validated before the canvas opens</p>
        </div>
        <NewBlueprintForm projects={projects} />
      </section>
    </IncShell>
  );
}
