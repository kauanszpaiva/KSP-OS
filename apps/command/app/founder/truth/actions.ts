'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@ksp/auth';
import { getServerSupabase } from '../../../lib/supabase';

export interface TruthActionResult {
  ok: boolean;
  error?: string;
}

const TYPES = new Set(['fact', 'decision', 'assumption', 'question', 'constraint']);
const STATUSES = new Set(['verified', 'unverified', 'needs_review', 'conflict', 'stale']);
const CONFIDENCE = new Set(['low', 'medium', 'high']);

export async function createTruthItem(_prev: TruthActionResult, form: FormData): Promise<TruthActionResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'Second Brain storage is not configured.' };

  const ctx = await getAuthContext(supabase);
  if (!ctx) return { ok: false, error: 'Unauthenticated.' };
  if (!ctx.internalRoles.includes('founder_ceo')) {
    return { ok: false, error: 'Second Brain is restricted to the founder.' };
  }

  const title = String(form.get('title') ?? '').trim();
  const content = String(form.get('content') ?? '').trim();
  const itemType = String(form.get('itemType') ?? 'fact').trim();
  const status = String(form.get('status') ?? 'unverified').trim();
  const confidence = String(form.get('confidence') ?? 'medium').trim();
  const sourceLabel = String(form.get('sourceLabel') ?? '').trim();
  const sourceUrl = String(form.get('sourceUrl') ?? '').trim();

  if (title.length < 2) return { ok: false, error: 'Add a short title.' };
  if (!TYPES.has(itemType)) return { ok: false, error: 'Unknown knowledge type.' };
  if (!STATUSES.has(status)) return { ok: false, error: 'Unknown verification state.' };
  if (!CONFIDENCE.has(confidence)) return { ok: false, error: 'Unknown confidence level.' };
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) return { ok: false, error: 'Source URL must start with http:// or https://.' };

  const { error } = await supabase.from('founder_truth_items').insert({
    organization_id: ctx.organizationId,
    owner_id: ctx.user.id,
    item_type: itemType,
    status,
    title,
    content: content || null,
    source_label: sourceLabel || null,
    source_url: sourceUrl || null,
    confidence,
    last_verified_at: status === 'verified' ? new Date().toISOString() : null
  });

  if (error) return { ok: false, error: 'Truth storage is not available in this environment yet.' };

  revalidatePath('/founder/truth');
  revalidatePath('/founder/home');
  return { ok: true };
}
