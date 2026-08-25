import type { SupabaseClient } from '@ksp/database';

export interface IncWorkPerson {
  id: string;
  displayName: string;
  role: string;
}

export interface IncWorkProject {
  id: string;
  name: string;
  businessUnitId: string | null;
  businessUnitName: string | null;
}

export interface IncWorkTask {
  id: string;
  title: string;
  projectId: string | null;
  ownerId: string | null;
  ownerName: string;
  status: string;
}

export async function getIncWorkAdminData(supabase: SupabaseClient, organizationId: string) {
  const [membershipResult, projectResult, taskResult] = await Promise.all([
    supabase
      .from('organization_memberships')
      .select('profile_id,internal_role,suspended_at,effective_from,effective_until,profiles(display_name)')
      .eq('organization_id', organizationId)
      .not('internal_role', 'is', null),
    supabase
      .from('projects')
      .select('id,name,business_unit_id,business_units(name)')
      .eq('organization_id', organizationId)
      .neq('status', 'archived')
      .order('name', { ascending: true }),
    supabase
      .from('tasks')
      .select('id,title,project_id,owner_id,status')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(120)
  ]);

  const now = Date.now();
  const people: IncWorkPerson[] = (membershipResult.data ?? [])
    .filter((row: any) => {
      if (row.suspended_at || !row.internal_role) return false;
      const starts = row.effective_from ? Date.parse(String(row.effective_from)) : Number.NEGATIVE_INFINITY;
      const ends = row.effective_until ? Date.parse(String(row.effective_until)) : Number.POSITIVE_INFINITY;
      return starts <= now && ends > now;
    })
    .map((row: any) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: String(row.profile_id),
        displayName: profile?.display_name ?? String(row.profile_id),
        role: String(row.internal_role)
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const projects: IncWorkProject[] = projectResult.error
    ? []
    : (projectResult.data ?? []).map((row: any) => {
        const unit = Array.isArray(row.business_units) ? row.business_units[0] : row.business_units;
        return {
          id: String(row.id),
          name: String(row.name),
          businessUnitId: row.business_unit_id ? String(row.business_unit_id) : null,
          businessUnitName: unit?.name ? String(unit.name) : null
        };
      });

  const names = new Map(people.map((person) => [person.id, person.displayName]));
  const tasks: IncWorkTask[] = (taskResult.data ?? []).map((row: any) => ({
    id: String(row.id),
    title: String(row.title),
    projectId: row.project_id ? String(row.project_id) : null,
    ownerId: row.owner_id ? String(row.owner_id) : null,
    ownerName: row.owner_id ? names.get(String(row.owner_id)) ?? 'Internal member' : 'Unassigned',
    status: String(row.status)
  }));

  return { people, projects, tasks };
}
