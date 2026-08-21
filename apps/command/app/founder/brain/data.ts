import type { SupabaseClient } from '@ksp/database';

export interface TruthItem {
  id: string;
  item_type: 'fact' | 'decision' | 'assumption' | 'question' | 'constraint';
  title: string;
  content: string | null;
  status: 'verified' | 'unverified' | 'needs_review' | 'conflict' | 'stale';
  confidence: 'low' | 'medium' | 'high';
  source_label: string | null;
  source_url: string | null;
  source_date: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrainSource {
  id: string;
  source_type: 'web' | 'drive' | 'github' | 'email' | 'document' | 'conversation' | 'note' | 'other';
  title: string;
  locator: string | null;
  summary: string | null;
  trust_status: 'primary' | 'trusted' | 'unverified' | 'conflict';
  source_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContextPack {
  id: string;
  title: string;
  purpose: string | null;
  content: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ContextPackSource {
  context_pack_id: string;
  source_id: string;
}

export interface Handoff {
  id: string;
  title: string;
  from_agent: string;
  to_agent: string;
  objective: string;
  context_pack_id: string | null;
  instructions: string | null;
  output: string | null;
  status: 'draft' | 'ready' | 'claimed' | 'done' | 'blocked' | 'cancelled';
  claimed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrainSearchResult {
  id: string;
  kind: 'capture' | 'truth' | 'source' | 'context' | 'handoff';
  title: string;
  detail: string | null;
  href: string;
  status?: string;
}

export async function getTruthItems(supabase: SupabaseClient, limit = 100): Promise<TruthItem[]> {
  const { data } = await supabase
    .from('founder_truth_items')
    .select('id, item_type, title, content, status, confidence, source_label, source_url, source_date, last_verified_at, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200));
  return (data ?? []) as TruthItem[];
}

export async function getSources(supabase: SupabaseClient, limit = 100): Promise<BrainSource[]> {
  const { data } = await supabase
    .from('founder_sources')
    .select('id, source_type, title, locator, summary, trust_status, source_date, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200));
  return (data ?? []) as BrainSource[];
}

export async function getContextPacks(supabase: SupabaseClient, limit = 100): Promise<ContextPack[]> {
  const { data } = await supabase
    .from('founder_context_packs')
    .select('id, title, purpose, content, status, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200));
  return (data ?? []) as ContextPack[];
}

export async function getContextPackSources(supabase: SupabaseClient): Promise<ContextPackSource[]> {
  const { data } = await supabase
    .from('founder_context_pack_sources')
    .select('context_pack_id, source_id');
  return (data ?? []) as ContextPackSource[];
}

export async function getHandoffs(supabase: SupabaseClient, limit = 100): Promise<Handoff[]> {
  const { data } = await supabase
    .from('founder_handoffs')
    .select('id, title, from_agent, to_agent, objective, context_pack_id, instructions, output, status, claimed_by, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200));
  return (data ?? []) as Handoff[];
}

export async function getContextPackById(supabase: SupabaseClient, id: string): Promise<ContextPack | null> {
  const { data } = await supabase
    .from('founder_context_packs')
    .select('id, title, purpose, content, status, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  return (data ?? null) as ContextPack | null;
}

export async function searchBrain(supabase: SupabaseClient, query: string, limit = 20): Promise<BrainSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const safe = q.replace(/[\\%_]/g, (value) => `\\${value}`);
  const pattern = `%${safe}%`;
  const perKind = Math.min(Math.max(Math.ceil(limit / 5), 3), 20);

  const [captures, truth, sources, contexts, handoffs] = await Promise.all([
    supabase
      .from('founder_inbox_items')
      .select('id, title, body, item_type, triage_status')
      .ilike('title', pattern)
      .order('created_at', { ascending: false })
      .limit(perKind),
    supabase
      .from('founder_truth_items')
      .select('id, title, content, item_type, status')
      .ilike('title', pattern)
      .order('updated_at', { ascending: false })
      .limit(perKind),
    supabase
      .from('founder_sources')
      .select('id, title, summary, source_type, trust_status')
      .ilike('title', pattern)
      .order('updated_at', { ascending: false })
      .limit(perKind),
    supabase
      .from('founder_context_packs')
      .select('id, title, purpose, status')
      .ilike('title', pattern)
      .order('updated_at', { ascending: false })
      .limit(perKind),
    supabase
      .from('founder_handoffs')
      .select('id, title, objective, to_agent, status')
      .ilike('title', pattern)
      .order('updated_at', { ascending: false })
      .limit(perKind)
  ]);

  const results: BrainSearchResult[] = [];
  for (const row of captures.data ?? []) {
    results.push({ id: row.id, kind: 'capture', title: row.title, detail: row.body, href: '/founder/inbox', status: row.triage_status });
  }
  for (const row of truth.data ?? []) {
    results.push({ id: row.id, kind: 'truth', title: row.title, detail: row.content, href: '/founder/truth', status: row.status });
  }
  for (const row of sources.data ?? []) {
    results.push({ id: row.id, kind: 'source', title: row.title, detail: row.summary, href: '/founder/sources', status: row.trust_status });
  }
  for (const row of contexts.data ?? []) {
    results.push({ id: row.id, kind: 'context', title: row.title, detail: row.purpose, href: '/founder/context', status: row.status });
  }
  for (const row of handoffs.data ?? []) {
    results.push({ id: row.id, kind: 'handoff', title: row.title, detail: `${row.to_agent}: ${row.objective}`, href: '/founder/handoffs', status: row.status });
  }
  return results.slice(0, Math.min(Math.max(limit, 1), 50));
}
