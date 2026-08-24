-- Self-service identity profile and private avatar storage.
-- Profile fields are editable only by their owner; protected identity and
-- access-control columns remain outside the authenticated UPDATE grant.

alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists phone_e164 text,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists timezone text not null default 'America/New_York',
  add column if not exists locale text not null default 'en-US',
  add column if not exists sms_opt_in boolean not null default false,
  add column if not exists sms_opted_in_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles
  drop constraint if exists profiles_phone_e164_format,
  add constraint profiles_phone_e164_format
    check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  drop constraint if exists profiles_locale_supported,
  add constraint profiles_locale_supported
    check (locale in ('en-US', 'pt-BR')),
  drop constraint if exists profiles_sms_requires_verified_phone,
  add constraint profiles_sms_requires_verified_phone
    check (not sms_opt_in or (phone_e164 is not null and phone_verified_at is not null));

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.reset_profile_phone_verification()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.phone_e164 is distinct from old.phone_e164 then
    new.phone_verified_at = null;
    new.sms_opt_in = false;
    new.sms_opted_in_at = null;
  end if;
  return new;
end;
$$;

revoke all on function public.reset_profile_phone_verification() from public;

drop trigger if exists profiles_reset_phone_verification on public.profiles;
create trigger profiles_reset_phone_verification
before update on public.profiles
for each row execute function public.reset_profile_phone_verification();

create or replace function public.set_profile_sms_opted_in_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.sms_opt_in and not old.sms_opt_in then
    new.sms_opted_in_at = now();
  elsif not new.sms_opt_in then
    new.sms_opted_in_at = null;
  end if;
  return new;
end;
$$;

revoke all on function public.set_profile_sms_opted_in_at() from public;

drop trigger if exists profiles_set_sms_opted_in_at on public.profiles;
create trigger profiles_set_sms_opted_in_at
before update on public.profiles
for each row execute function public.set_profile_sms_opted_in_at();

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and (avatar_path is null or split_part(avatar_path, '/', 1) = id::text)
);

-- RLS limits the row; column privileges limit what the owner may mutate.
-- Email, status, MFA requirements, verification timestamps, and email-brand
-- fields remain server/admin controlled.
revoke update on public.profiles from authenticated;
grant update (
  display_name,
  avatar_path,
  phone_e164,
  timezone,
  locale,
  sms_opt_in
) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Security-definer keeps membership tables private while answering only the
-- yes/no question required by Storage RLS. Object paths start with profile id.
create or replace function public.can_read_profile_avatar(target_profile_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and (
      target_profile_id = auth.uid()::text
      or exists (
        select 1
        from public.organization_memberships viewer
        join public.organization_memberships subject
          on subject.organization_id = viewer.organization_id
        where viewer.profile_id = auth.uid()
          and subject.profile_id::text = target_profile_id
          and viewer.suspended_at is null
          and subject.suspended_at is null
          and (viewer.effective_until is null or viewer.effective_until > now())
          and (subject.effective_until is null or subject.effective_until > now())
      )
      or exists (
        select 1
        from public.client_memberships viewer
        join public.client_memberships subject
          on subject.organization_id = viewer.organization_id
         and subject.client_organization_id = viewer.client_organization_id
        where viewer.profile_id = auth.uid()
          and subject.profile_id::text = target_profile_id
          and viewer.suspended_at is null
          and subject.suspended_at is null
          and (viewer.effective_until is null or viewer.effective_until > now())
          and (subject.effective_until is null or subject.effective_until > now())
      )
      or exists (
        select 1
        from public.organization_memberships viewer
        join public.client_memberships subject
          on subject.organization_id = viewer.organization_id
        where viewer.profile_id = auth.uid()
          and viewer.internal_role in ('founder_ceo', 'executive_operations')
          and subject.profile_id::text = target_profile_id
          and viewer.suspended_at is null
          and subject.suspended_at is null
          and (viewer.effective_until is null or viewer.effective_until > now())
          and (subject.effective_until is null or subject.effective_until > now())
      )
    )
$$;

revoke all on function public.can_read_profile_avatar(text) from public;
grant execute on function public.can_read_profile_avatar(text) to authenticated;

drop policy if exists profile_avatars_read on storage.objects;
create policy profile_avatars_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-avatars'
  and public.can_read_profile_avatar(split_part(name, '/', 1))
);

drop policy if exists profile_avatars_self_upload on storage.objects;
create policy profile_avatars_self_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and split_part(name, '/', 1) = auth.uid()::text
  and split_part(name, '/', 2) <> ''
);

-- No authenticated UPDATE/DELETE policy: avatar originals are immutable and
-- replacement uses a fresh server-generated path. Cleanup remains a service job.
