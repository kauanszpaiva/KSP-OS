import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@ksp/database';

export const PROFILE_AVATAR_BUCKET = 'profile-avatars';
export const PROFILE_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export interface EditableProfile {
  id: string;
  displayName: string;
  email: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  phoneE164: string;
  phoneVerified: boolean;
  timezone: string;
  locale: 'en-US' | 'pt-BR';
  smsOptIn: boolean;
}

export interface OwnProfileUpdate {
  displayName: string;
  phoneE164: string;
  timezone: string;
  locale: 'en-US' | 'pt-BR';
  smsOptIn: boolean;
}

export type ProfileUpdateResult =
  | { ok: true; avatarChanged: boolean }
  | { ok: false; code: 'avatar_type' | 'avatar_size' | 'avatar_upload' | 'profile_update' };

const AVATAR_EXTENSION: Record<(typeof PROFILE_AVATAR_MIME_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

export async function createProfileAvatarUrl(supabase: SupabaseClient, avatarPath: string | null | undefined): Promise<string | null> {
  if (!avatarPath) return null;
  const { data, error } = await supabase.storage.from(PROFILE_AVATAR_BUCKET).createSignedUrl(avatarPath, 60 * 60);
  return error ? null : data.signedUrl;
}

export async function getEditableProfile(supabase: SupabaseClient, userId: string): Promise<EditableProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, email, avatar_path, phone_e164, phone_verified_at, timezone, locale, sms_opt_in')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as {
    id: string;
    display_name: string;
    email: string;
    avatar_path: string | null;
    phone_e164: string | null;
    phone_verified_at: string | null;
    timezone: string | null;
    locale: string | null;
    sms_opt_in: boolean | null;
  };

  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    avatarPath: row.avatar_path,
    avatarUrl: await createProfileAvatarUrl(supabase, row.avatar_path),
    phoneE164: row.phone_e164 ?? '',
    phoneVerified: Boolean(row.phone_verified_at),
    timezone: row.timezone ?? 'America/New_York',
    locale: row.locale === 'pt-BR' ? 'pt-BR' : 'en-US',
    smsOptIn: Boolean(row.sms_opt_in)
  };
}

export async function updateOwnProfile(
  supabase: SupabaseClient,
  userId: string,
  input: OwnProfileUpdate,
  avatar: File | null
): Promise<ProfileUpdateResult> {
  let avatarPath: string | null = null;

  if (avatar) {
    if (!PROFILE_AVATAR_MIME_TYPES.includes(avatar.type as (typeof PROFILE_AVATAR_MIME_TYPES)[number])) {
      return { ok: false, code: 'avatar_type' };
    }
    if (avatar.size > PROFILE_AVATAR_MAX_BYTES) return { ok: false, code: 'avatar_size' };

    const extension = AVATAR_EXTENSION[avatar.type as (typeof PROFILE_AVATAR_MIME_TYPES)[number]];
    avatarPath = `${userId}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(PROFILE_AVATAR_BUCKET).upload(avatarPath, avatar, {
      contentType: avatar.type,
      upsert: false
    });
    if (uploadError) return { ok: false, code: 'avatar_upload' };
  }

  const patch: Record<string, unknown> = {
    display_name: input.displayName,
    phone_e164: input.phoneE164 || null,
    timezone: input.timezone,
    locale: input.locale,
    sms_opt_in: input.smsOptIn
  };
  if (avatarPath) patch.avatar_path = avatarPath;

  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) return { ok: false, code: 'profile_update' };
  return { ok: true, avatarChanged: Boolean(avatarPath) };
}
