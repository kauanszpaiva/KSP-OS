import type { SupabaseClient } from '@ksp/database';
import type { ApprovalDecision, ApprovalRequest, Commitment, CompanyOutcome, InboxItem, Proof } from '@ksp/database';

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
