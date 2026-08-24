'use server';

import { getEditableProfile, getPortalAuthContext, updateOwnProfile } from '@ksp/auth';
import { updateOwnProfileSchema } from '@ksp/validation';
import type { ProfileActionState } from '@ksp/ui';
import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '../../../../lib/supabase';

const PROFILE_ERRORS = {
  avatar_type: 'Choose a JPG, PNG, or WebP image.',
  avatar_size: 'The profile photo must be 5 MB or smaller.',
  avatar_upload: 'The photo could not be uploaded. Try again.',
  profile_update: 'The profile could not be saved. Try again.'
} as const;

export async function updateProfileAction(_state: ProfileActionState, form: FormData): Promise<ProfileActionState> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured in this environment.' };
  const ctx = await getPortalAuthContext(supabase);
  if (!ctx) return { ok: false, error: 'Sign in again, then retry.' };

  const parsed = updateOwnProfileSchema.safeParse({
    displayName: form.get('displayName'),
    phoneE164: form.get('phoneE164'),
    timezone: form.get('timezone'),
    locale: form.get('locale'),
    smsOptIn: form.get('smsOptIn') === 'on'
  });
  if (!parsed.success) return { ok: false, error: 'Review the name, phone, language, and time zone.' };

  const current = await getEditableProfile(supabase, ctx.user.id);
  if (!current) return { ok: false, error: 'Your profile could not be loaded.' };
  const avatarEntry = form.get('avatar');
  const avatar = !avatarEntry || typeof avatarEntry === 'string' || !avatarEntry.size ? null : avatarEntry;
  const result = await updateOwnProfile(
    supabase,
    ctx.user.id,
    {
      ...parsed.data,
      smsOptIn: parsed.data.smsOptIn && current.phoneVerified && current.phoneE164 === parsed.data.phoneE164
    },
    avatar
  );
  if (!result.ok) return { ok: false, error: PROFILE_ERRORS[result.code] };

  revalidatePath('/settings/profile');
  revalidatePath('/', 'layout');
  return { ok: true };
}
