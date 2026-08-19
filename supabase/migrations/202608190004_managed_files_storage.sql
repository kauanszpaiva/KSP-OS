-- Pack 04: private managed-files storage with document-backed authorization.
-- File bytes stay private. Metadata in public.documents remains the source of truth.
-- Supabase owns storage.objects and ships it with ENABLE ROW LEVEL SECURITY;
-- this migration adds bucket-scoped policies without attempting to take table ownership.

insert into storage.buckets (id, name, public)
values ('managed-files', 'managed-files', false)
on conflict (id) do update
set name = excluded.name,
    public = false;

-- Object paths are canonicalized as:
--   <organization_id>/<document_id>/<filename>
-- and must exactly match documents.storage_path.

create or replace function public.managed_file_document_matches(
  object_name text,
  document_id uuid,
  organization_id uuid,
  storage_path text
) returns boolean
language sql
immutable
as $$
  select storage_path = object_name
    and split_part(object_name, '/', 1) = organization_id::text
    and split_part(object_name, '/', 2) = document_id::text
$$;

revoke all on function public.managed_file_document_matches(text, uuid, uuid, text) from public;
grant execute on function public.managed_file_document_matches(text, uuid, uuid, text) to authenticated;

drop policy if exists managed_files_authenticated_read on storage.objects;
create policy managed_files_authenticated_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'managed-files'
  and exists (
    select 1
    from public.documents d
    where public.managed_file_document_matches(name, d.id, d.organization_id, d.storage_path)
      and (
        (
          public.is_internal_member(d.organization_id)
          and (public.is_executive(d.organization_id) or d.classification <> 'restricted')
        )
        or (
          d.client_id is not null
          and d.client_visible
          and d.classification = 'public'
          and d.status = 'active'
          and public.is_portal_member(d.client_id)
        )
      )
  )
);

drop policy if exists managed_files_internal_upload on storage.objects;
create policy managed_files_internal_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'managed-files'
  and exists (
    select 1
    from public.documents d
    where public.managed_file_document_matches(name, d.id, d.organization_id, d.storage_path)
      and public.is_internal_member(d.organization_id)
      and (public.is_executive(d.organization_id) or d.classification <> 'restricted')
  )
);

-- Deliberately no UPDATE or DELETE policy for authenticated users.
-- This keeps ordinary uploads append-only and prevents overwrite/upsert or deletion
-- through end-user JWTs. Privileged service operations remain server-side only.
