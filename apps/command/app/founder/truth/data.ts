import type { SupabaseClient } from '@ksp/database';

export type TruthItemType = 'fact' | 'decision' | 'assumption' | 'question' | 'constraint';
export type TruthStatus = 'verified' | 'unverified' | 'needs_review' | 'conflict' | 'stale';
export type TruthConfidence = 'low' | 'medium' | 'high';

export interface FounderTruthItem {
  id: string;
  item_type: TruthItemType;
  status: TruthStatus;
  title: string;
  content: string | null;
  source_label: string | null;
  source_url: string | null;
  source_date: string | null;
  confidence: TruthConfidence;
  last_verified_at: string | null;
  updated_at: string;
}

export interface FounderTruthResult {
  items: FounderTruthItem[];
  schemaAvailable: boolean;
}

/**
 * Reads only through the caller-scoped Supabase client. RLS remains the final
 * owner + founder authorization boundary. A missing table is handled as an
 * explicit rollout state so preview UI can render before the additive migration
 * is promoted to the connected database.
 */
export async function getFounderTruth(supabase: SupabaseClient): Promise<FounderTruthResult> {
  const { data, error } = await supabase
    .from('founder_truth_items')
    .select('id, item_type, status, title, content, source_label, source_url, source_date, confidence, last_verified_at, updated_at')
    .is('archived_at', null)
    .order('updated_at', { ascending: false });

  if (error) {
    return { items: [], schemaAvailable: false };
  }

  return { items: (data ?? []) as FounderTruthItem[], schemaAvailable: true };
}
