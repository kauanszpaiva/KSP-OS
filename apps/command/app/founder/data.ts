import type { SupabaseClient } from '@ksp/database';

/**
 * Founder OS read layer. Every query runs through the caller-scoped Supabase
 * client, so RLS (owner_id = auth.uid() AND is_founder) is the real gate — these
 * functions never use service-role access. Company reads (commitments) are
 * additionally owner-filtered so "My Work" references, never mirrors, company work.
 */

export interface FounderInboxItem {
  id: string;
  item_type: string;
  title: string;
  body: string | null;
  triage_status: string;
  target_table: string | null;
  target_id: string | null;
  created_at: string;
}

export interface AiInboxItem {
  id: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FounderTask {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  waiting_on: string | null;
  source_inbox_id: string | null;
  created_at: string;
}

export interface CompanyWorkItem {
  id: string;
  title: string;
  state: string;
  due_date: string | null;
  next_action_date: string | null;
  progress: number;
}

export async function getInboxItems(supabase: SupabaseClient): Promise<FounderInboxItem[]> {
  const { data } = await supabase
    .from('founder_inbox_items')
    .select('id, item_type, title, body, triage_status, target_table, target_id, created_at')
    .order('created_at', { ascending: false });
  return (data ?? []) as FounderInboxItem[];
}

/**
 * AI Inbox intentionally reuses founder_vault_entries because that table is
 * already deployed and founder-only in Production. entry_type isolates these
 * rows from ordinary vault notes without introducing another schema dependency.
 */
export async function getAiInboxItems(supabase: SupabaseClient): Promise<AiInboxItem[]> {
  const { data } = await supabase
    .from('founder_vault_entries')
    .select('id, title, body, metadata, created_at, updated_at')
    .eq('entry_type', 'ai_request')
    .order('created_at', { ascending: false });
  return (data ?? []) as AiInboxItem[];
}

export async function getFounderTasks(supabase: SupabaseClient): Promise<FounderTask[]> {
  const { data } = await supabase
    .from('founder_tasks')
    .select('id, title, notes, status, priority, due_date, waiting_on, source_inbox_id, created_at')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  return (data ?? []) as FounderTask[];
}

/**
 * Company commitments the founder personally owns — read-only reference, RLS
 * already permits the founder to read these. This is the ONE bridge from
 * Company OS into Founder OS "My Work"; it copies nothing.
 */
export async function getCompanyWork(supabase: SupabaseClient, ownerId: string): Promise<CompanyWorkItem[]> {
  const { data } = await supabase
    .from('commitments')
    .select('id, title, state, due_date, next_action_date, progress')
    .eq('owner_id', ownerId)
    .in('state', ['open', 'in_progress', 'blocked'])
    .order('due_date', { ascending: true, nullsFirst: false });
  return (data ?? []) as CompanyWorkItem[];
}

export interface VaultRef {
  id: string;
  entry_type: string;
  title: string;
  created_at: string;
}

export async function getRecentVault(supabase: SupabaseClient, limit = 3): Promise<VaultRef[]> {
  const { data } = await supabase
    .from('founder_vault_entries')
    .select('id, entry_type, title, created_at')
    .neq('entry_type', 'ai_request')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as VaultRef[];
}

export interface FounderHome {
  inbox: FounderInboxItem[];
  tasks: FounderTask[];
  companyWork: CompanyWorkItem[];
  vault: VaultRef[];
}

/**
 * Single parallel fetch for Founder Home — four reads, not dozens of sequential
 * calls. No metrics are invented: every figure on Home is a count/derivation of
 * these real rows.
 */
export async function getFounderHome(supabase: SupabaseClient, ownerId: string): Promise<FounderHome> {
  const [inbox, tasks, companyWork, vault] = await Promise.all([
    getInboxItems(supabase),
    getFounderTasks(supabase),
    getCompanyWork(supabase, ownerId),
    getRecentVault(supabase)
  ]);
  return { inbox, tasks, companyWork, vault };
}
