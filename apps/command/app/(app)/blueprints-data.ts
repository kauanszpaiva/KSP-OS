import type { Blueprint, BlueprintView, SupabaseClient } from '@ksp/database';

/**
 * Blueprint library reads. `blueprints_read` RLS is org-wide for internal
 * members; projects are only joined for display names (their own RLS still
 * governs project access elsewhere).
 */
export async function getBlueprints(supabase: SupabaseClient): Promise<BlueprintView[]> {
  const [{ data: blueprints }, { data: projects }] = await Promise.all([
    supabase.from('blueprints').select('*').order('updated_at', { ascending: false }),
    supabase.from('projects').select('id, name').order('name', { ascending: true })
  ]);

  const nameById = new Map(((projects ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]));
  return ((blueprints ?? []) as Blueprint[]).map((blueprint) => ({
    ...blueprint,
    projectName: blueprint.project_id ? nameById.get(blueprint.project_id) ?? null : null
  }));
}

export async function getBlueprint(supabase: SupabaseClient, id: string): Promise<BlueprintView | null> {
  const [{ data: blueprint }, { data: projects }] = await Promise.all([
    supabase.from('blueprints').select('*').eq('id', id).maybeSingle(),
    supabase.from('projects').select('id, name')
  ]);
  if (!blueprint) return null;
  const nameById = new Map(((projects ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]));
  return {
    ...(blueprint as Blueprint),
    projectName: blueprint.project_id ? nameById.get(blueprint.project_id) ?? null : null
  };
}

/** Lightweight project picker options (id + name), for the blueprint form. */
export async function getBlueprintProjects(supabase: SupabaseClient): Promise<Array<{ id: string; name: string }>> {
  const { data } = await supabase.from('projects').select('id, name').order('name', { ascending: true });
  return (data ?? []) as Array<{ id: string; name: string }>;
}
