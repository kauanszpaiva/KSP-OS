export const KSPCENTER_SUPABASE_PROJECT_REF = 'rmaxqwbjizivkhurvuvx';
export const KSPCENTER_SUPABASE_URL = `https://${KSPCENTER_SUPABASE_PROJECT_REF}.supabase.co`;

export function assertCanonicalProductionSupabaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('production_supabase_target_invalid');
  }

  if (parsed.protocol !== 'https:' || parsed.origin !== KSPCENTER_SUPABASE_URL) {
    throw new Error('production_supabase_target_mismatch');
  }

  return parsed.origin;
}
