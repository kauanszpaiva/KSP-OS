import type { SupabaseClient } from '@ksp/database';
import type { Commitment, CompanyOutcome, Proof } from '@ksp/database';

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

export async function getMyCommitments(supabase: SupabaseClient, userId: string): Promise<CommitmentView[]> {
  const all = await getCommitments(supabase);
  const { data: assignments } = await supabase.from('commitment_assignments').select('commitment_id').eq('profile_id', userId);
  const assigned = new Set(((assignments ?? []) as Array<{ commitment_id: string }>).map((a) => a.commitment_id));
  return all.filter((c) => c.owner_id === userId || assigned.has(c.id));
}
