import type { SupabaseClient } from '@ksp/database';
import type {
  ApprovalDecision,
  ApprovalRequest,
  Commitment,
  CompanyOutcome,
  InboxItem,
  MissionDependency,
  MissionMilestone,
  Project,
  ProjectMembership,
  Proof,
  Task
} from '@ksp/database';

export interface MemberRef {
  id: string;
  displayName: string;
}

export interface CommitmentView extends Commitment {
  ownerName: string;
  proofs: Proof[];
}

export async function getMembers(supabase: SupabaseClient, userId: string): Promise<MemberRef[]> {
  // profiles_org_read RLS scopes this to org peers.
  const { data } = await supabase.from('profiles').select('id, display_name').order('display_name');
  const rows = (data ?? []) as Array<{ id: string; display_name: string }>;
  const list = rows.map((r) => ({ id: r.id, displayName: r.display_name }));
  if (!list.some((m) => m.id === userId)) return list;
  return list;
}

export async function getOutcomes(supabase: SupabaseClient): Promise<CompanyOutcome[]> {
  const { data } = await supabase.from('company_outcomes').select('*').order('created_at', { ascending: false });
  return (data ?? []) as CompanyOutcome[];
}

export async function getCommitments(supabase: SupabaseClient): Promise<CommitmentView[]> {
  const [{ data: commitments }, { data: profiles }, { data: proofs }] = await Promise.all([
    supabase.from('commitments').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, display_name'),
    supabase.from('proofs').select('*').order('created_at', { ascending: false })
  ]);
  const nameById = new Map((((profiles ?? []) as Array<{ id: string; display_name: string }>).map((p) => [p.id, p.display_name])));
  const proofsByCommitment = new Map<string, Proof[]>();
  for (const p of (proofs ?? []) as Proof[]) {
    const arr = proofsByCommitment.get(p.commitment_id) ?? [];
    arr.push(p);
    proofsByCommitment.set(p.commitment_id, arr);
  }
  return ((commitments ?? []) as Commitment[]).map((c) => ({
    ...c,
    ownerName: nameById.get(c.owner_id) ?? 'Unassigned',
    proofs: proofsByCommitment.get(c.id) ?? []
  }));
}

export interface ActivityView {
  id: string;
  verb: string;
  summary: string;
  created_at: string;
  actorName: string;
}

export async function getActivity(supabase: SupabaseClient, limit = 8): Promise<ActivityView[]> {
  const [{ data: events }, { data: profiles }] = await Promise.all([
    supabase.from('activity_events').select('id, verb, summary, created_at, actor_id').order('created_at', { ascending: false }).limit(limit),
    supabase.from('profiles').select('id, display_name')
  ]);
  const nameById = new Map(((profiles ?? []) as Array<{ id: string; display_name: string }>).map((p) => [p.id, p.display_name]));
  return ((events ?? []) as Array<{ id: string; verb: string; summary: string; created_at: string; actor_id: string | null }>).map((e) => ({
    id: e.id,
    verb: e.verb,
    summary: e.summary,
    created_at: e.created_at,
    actorName: (e.actor_id && nameById.get(e.actor_id)) || 'System'
  }));
}

export async function getMyCommitments(supabase: SupabaseClient, userId: string): Promise<CommitmentView[]> {
  const all = await getCommitments(supabase);
  const { data: assignments } = await supabase.from('commitment_assignments').select('commitment_id').eq('profile_id', userId);
  const assigned = new Set(((assignments ?? []) as Array<{ commitment_id: string }>).map((a) => a.commitment_id));
  return all.filter((c) => c.owner_id === userId || assigned.has(c.id));
}

/* --------------------------------------------------------------- Phase C2 -- */

export interface SignalView extends InboxItem {
  creatorName: string;
}

export async function getSignals(supabase: SupabaseClient): Promise<SignalView[]> {
  // inbox_owner_read RLS scopes rows to the executive (all) or the creator (own).
  const [{ data: items }, { data: profiles }] = await Promise.all([
    supabase.from('inbox_items').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, display_name')
  ]);
  const nameById = new Map(((profiles ?? []) as Array<{ id: string; display_name: string }>).map((p) => [p.id, p.display_name]));
  return ((items ?? []) as InboxItem[]).map((i) => ({
    ...i,
    creatorName: (i.created_by && nameById.get(i.created_by)) || 'Unknown'
  }));
}

export interface DecisionView extends ApprovalRequest {
  requesterName: string;
  decisions: ApprovalDecision[];
}

export async function getDecisions(supabase: SupabaseClient): Promise<DecisionView[]> {
  // approvals_executive_read RLS scopes rows to the executive (all) or the requester (own).
  const [{ data: requests }, { data: profiles }, { data: decisions }] = await Promise.all([
    supabase.from('approval_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, display_name'),
    supabase.from('approval_decisions').select('*').order('created_at', { ascending: false })
  ]);
  const nameById = new Map(((profiles ?? []) as Array<{ id: string; display_name: string }>).map((p) => [p.id, p.display_name]));
  const decisionsByRequest = new Map<string, ApprovalDecision[]>();
  for (const d of (decisions ?? []) as ApprovalDecision[]) {
    const arr = decisionsByRequest.get(d.approval_request_id) ?? [];
    arr.push(d);
    decisionsByRequest.set(d.approval_request_id, arr);
  }
  return ((requests ?? []) as ApprovalRequest[]).map((r) => ({
    ...r,
    requesterName: nameById.get(r.requester_id) ?? 'Unknown',
    decisions: decisionsByRequest.get(r.id) ?? []
  }));
}

/* --------------------------------------------------------------- Phase C3 -- */

export interface MissionView extends Project {
  milestones: MissionMilestone[];
  dependencies: MissionDependency[];
  memberIds: string[];
  commitmentCount: number;
}

export async function getMissions(supabase: SupabaseClient): Promise<MissionView[]> {
  // projects_member_read RLS scopes rows to the executive (all) or an assigned member.
  const [{ data: projects }, { data: milestones }, { data: dependencies }, { data: memberships }, { data: commitments }] =
    await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('mission_milestones').select('*').order('sort_order', { ascending: true }),
      supabase.from('mission_dependencies').select('*'),
      supabase.from('project_memberships').select('project_id, profile_id'),
      supabase.from('commitments').select('id, outcome_id').not('outcome_id', 'is', null)
    ]);

  const milestonesByProject = new Map<string, MissionMilestone[]>();
  for (const m of (milestones ?? []) as MissionMilestone[]) {
    const arr = milestonesByProject.get(m.project_id) ?? [];
    arr.push(m);
    milestonesByProject.set(m.project_id, arr);
  }
  const dependenciesByProject = new Map<string, MissionDependency[]>();
  for (const d of (dependencies ?? []) as MissionDependency[]) {
    const arr = dependenciesByProject.get(d.project_id) ?? [];
    arr.push(d);
    dependenciesByProject.set(d.project_id, arr);
  }
  const membersByProject = new Map<string, string[]>();
  for (const m of (memberships ?? []) as Array<{ project_id: string; profile_id: string }>) {
    const arr = membersByProject.get(m.project_id) ?? [];
    arr.push(m.profile_id);
    membersByProject.set(m.project_id, arr);
  }
  void commitments; // reserved: commitments do not yet carry a mission/project link (Phase C3 follow-up).

  return ((projects ?? []) as Project[]).map((p) => ({
    ...p,
    milestones: milestonesByProject.get(p.id) ?? [],
    dependencies: dependenciesByProject.get(p.id) ?? [],
    memberIds: membersByProject.get(p.id) ?? [],
    commitmentCount: 0
  }));
}

export async function getMissionMembers(supabase: SupabaseClient): Promise<ProjectMembership[]> {
  const { data } = await supabase.from('project_memberships').select('*');
  return (data ?? []) as ProjectMembership[];
}

/* ----------------------------------------------------------- Phase C3: Workspace -- */

export interface TaskView extends Task {
  ownerName: string;
  projectName: string | null;
}

export async function getTasks(supabase: SupabaseClient): Promise<TaskView[]> {
  // tasks_project_read RLS scopes rows to the executive (all), unassigned tasks, or an assigned project's members.
  const [{ data: tasks }, { data: profiles }, { data: projects }] = await Promise.all([
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, display_name'),
    supabase.from('projects').select('id, name')
  ]);
  const nameById = new Map(((profiles ?? []) as Array<{ id: string; display_name: string }>).map((p) => [p.id, p.display_name]));
  const projectNameById = new Map(((projects ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]));
  return ((tasks ?? []) as Task[]).map((t) => ({
    ...t,
    ownerName: (t.owner_id && nameById.get(t.owner_id)) || 'Unassigned',
    projectName: (t.project_id && projectNameById.get(t.project_id)) || null
  }));
}

/* --------------------------------------------------------- Phase C3: Team -- */

export interface TeamLoadView {
  profileId: string;
  displayName: string;
  openCommitments: number;
  openTasks: number;
  missionCount: number;
}

/**
 * v1 capacity signal: a simple open-item count per person, not hour-based
 * allocation (no table tracks planned hours yet). Good enough to flag who is
 * visibly overloaded; a real capacity model is a Phase C3 follow-up.
 */
export async function getTeamLoad(supabase: SupabaseClient): Promise<TeamLoadView[]> {
  const [{ data: profiles }, { data: assignments }, { data: tasks }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('id, display_name'),
    supabase.from('commitment_assignments').select('profile_id, commitment_id'),
    supabase.from('tasks').select('owner_id, status'),
    supabase.from('project_memberships').select('profile_id, project_id')
  ]);

  const commitmentIds = new Set(((assignments ?? []) as Array<{ commitment_id: string }>).map((a) => a.commitment_id));
  const { data: openCommitments } = commitmentIds.size
    ? await supabase.from('commitments').select('id').in('id', [...commitmentIds]).not('state', 'in', '(completed,archived,rejected)')
    : { data: [] as Array<{ id: string }> };
  const openCommitmentIds = new Set(((openCommitments ?? []) as Array<{ id: string }>).map((c) => c.id));

  const load = new Map<string, TeamLoadView>();
  for (const p of (profiles ?? []) as Array<{ id: string; display_name: string }>) {
    load.set(p.id, { profileId: p.id, displayName: p.display_name, openCommitments: 0, openTasks: 0, missionCount: 0 });
  }
  for (const a of (assignments ?? []) as Array<{ profile_id: string; commitment_id: string }>) {
    if (!openCommitmentIds.has(a.commitment_id)) continue;
    const row = load.get(a.profile_id);
    if (row) row.openCommitments += 1;
  }
  for (const t of (tasks ?? []) as Array<{ owner_id: string | null; status: string }>) {
    if (!t.owner_id || t.status !== 'active') continue;
    const row = load.get(t.owner_id);
    if (row) row.openTasks += 1;
  }
  const missionsByProfile = new Set<string>();
  for (const m of (memberships ?? []) as Array<{ profile_id: string; project_id: string }>) {
    const key = `${m.profile_id}:${m.project_id}`;
    if (missionsByProfile.has(key)) continue;
    missionsByProfile.add(key);
    const row = load.get(m.profile_id);
    if (row) row.missionCount += 1;
  }

  return [...load.values()].sort((a, b) => b.openCommitments + b.openTasks - (a.openCommitments + a.openTasks));
}
