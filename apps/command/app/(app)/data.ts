import type { SupabaseClient } from '@ksp/database';
import type { Commitment, CompanyOutcome, Proof } from '@ksp/database';

export interface MemberRef {
  id: string;
  displayName: string;
}

export interface AssigneeRef {
  profileId: string;
  name: string;
  role: 'accountable' | 'contributor';
}

export interface CommitmentView extends Commitment {
  ownerName: string;
  proofs: Proof[];
  assignees: AssigneeRef[];
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
  const [{ data: commitments }, { data: profiles }, { data: proofs }, { data: assignments }] = await Promise.all([
    supabase.from('commitments').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, display_name'),
    supabase.from('proofs').select('*').order('created_at', { ascending: false }),
    supabase.from('commitment_assignments').select('commitment_id, profile_id, role')
  ]);
  const nameById = new Map((((profiles ?? []) as Array<{ id: string; display_name: string }>).map((p) => [p.id, p.display_name])));
  const proofsByCommitment = new Map<string, Proof[]>();
  for (const p of (proofs ?? []) as Proof[]) {
    const arr = proofsByCommitment.get(p.commitment_id) ?? [];
    arr.push(p);
    proofsByCommitment.set(p.commitment_id, arr);
  }
  const assigneesByCommitment = new Map<string, AssigneeRef[]>();
  for (const a of (assignments ?? []) as Array<{ commitment_id: string; profile_id: string; role: 'accountable' | 'contributor' }>) {
    const arr = assigneesByCommitment.get(a.commitment_id) ?? [];
    arr.push({ profileId: a.profile_id, role: a.role, name: nameById.get(a.profile_id) ?? 'Unknown' });
    assigneesByCommitment.set(a.commitment_id, arr);
  }
  return ((commitments ?? []) as Commitment[]).map((c) => ({
    ...c,
    ownerName: nameById.get(c.owner_id) ?? 'Unassigned',
    proofs: proofsByCommitment.get(c.id) ?? [],
    assignees: assigneesByCommitment.get(c.id) ?? []
  }));
}

export interface CommentView {
  id: string;
  commitment_id: string;
  body: string;
  created_at: string;
  authorId: string | null;
  authorName: string;
}

export async function getComments(supabase: SupabaseClient): Promise<CommentView[]> {
  const [{ data: comments }, { data: profiles }] = await Promise.all([
    supabase.from('commitment_comments').select('id, commitment_id, body, created_at, author_id').is('deleted_at', null).order('created_at', { ascending: true }),
    supabase.from('profiles').select('id, display_name')
  ]);
  const nameById = new Map(((profiles ?? []) as Array<{ id: string; display_name: string }>).map((p) => [p.id, p.display_name]));
  return ((comments ?? []) as Array<{ id: string; commitment_id: string; body: string; created_at: string; author_id: string | null }>).map((c) => ({
    id: c.id,
    commitment_id: c.commitment_id,
    body: c.body,
    created_at: c.created_at,
    authorId: c.author_id,
    authorName: (c.author_id && nameById.get(c.author_id)) || 'Unknown'
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
