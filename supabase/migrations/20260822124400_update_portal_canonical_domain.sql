-- Canonicalize every active Client Portal invitation URL on the new public domain.
-- Production was updated through the same migration on 2026-08-22.
-- Provider credentials remain in Supabase Vault and are never embedded here.

do $$
declare
  v_secret_id uuid;
  v_definition text;
begin
  select id into v_secret_id
  from vault.secrets
  where name = 'ksp_portal_base_url'
  limit 1;

  if v_secret_id is null then
    perform vault.create_secret(
      'https://kspdominionportal.com',
      'ksp_portal_base_url',
      'Canonical KSP Client Portal base URL'
    );
  else
    perform vault.update_secret(
      v_secret_id,
      new_secret => 'https://kspdominionportal.com'
    );
  end if;

  select pg_get_functiondef('public.ksp_portal_invitation_email_before_insert()'::regprocedure)
  into v_definition;

  if v_definition is null then
    raise exception 'ksp_portal_invitation_email_before_insert_missing';
  end if;

  v_definition := replace(
    v_definition,
    'https://ksp-os-portal.vercel.app',
    'https://kspdominionportal.com'
  );

  execute v_definition;
end
$$;
