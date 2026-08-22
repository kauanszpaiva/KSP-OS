-- KSP Client Portal invitation delivery.
-- Mirrors production changes applied on 2026-08-22. Secrets are read from
-- Supabase Vault; this migration intentionally contains no provider credential.

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists email_title text;
alter table public.profiles add column if not exists email_signature text;

alter table public.portal_invitations add column if not exists email_token_hash text;
alter table public.portal_invitations add column if not exists email_delivery_status text not null default 'not_sent';
alter table public.portal_invitations add column if not exists email_provider_message_id text;
alter table public.portal_invitations add column if not exists email_sent_at timestamptz;
alter table public.portal_invitations add column if not exists email_last_error text;

create unique index if not exists portal_invitations_email_token_hash_uq
  on public.portal_invitations(email_token_hash)
  where email_token_hash is not null;

create or replace function public.ksp_get_resend_api_key()
returns text
language sql
security definer
set search_path = 'public', 'vault'
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'ksp_resend_api_key'
  limit 1
$$;
revoke all on function public.ksp_get_resend_api_key() from public;
grant execute on function public.ksp_get_resend_api_key() to service_role;

create or replace function public.ksp_email_escape_html(v text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(replace(replace(coalesce(v,''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#039;')
$$;
revoke all on function public.ksp_email_escape_html(text) from public;

create or replace function public.ksp_portal_invitation_email_before_insert()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'extensions', 'vault'
as $$
declare
  v_api_key text;
  v_raw_token text;
  v_portal_base text;
  v_inviter record;
  v_client_name text;
  v_recipient_name text;
  v_role_label text;
  v_expiry text;
  v_projects_text text;
  v_projects_html text;
  v_invite_url text;
  v_subject text;
  v_text text;
  v_html text;
  v_payload jsonb;
  v_response extensions.http_response;
  v_response_json jsonb;
  v_message_id text;
begin
  select public.ksp_get_resend_api_key() into v_api_key;
  if v_api_key is null or length(trim(v_api_key)) < 10 then
    raise exception 'portal_invitation_email_provider_not_configured';
  end if;

  v_raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  new.email_token_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');

  select decrypted_secret into v_portal_base
  from vault.decrypted_secrets
  where name = 'ksp_portal_base_url'
  limit 1;
  v_portal_base := coalesce(nullif(trim(v_portal_base), ''), 'https://ksp-os-portal.vercel.app');
  v_portal_base := regexp_replace(v_portal_base, '/+$', '');
  v_invite_url := v_portal_base || '/invite/' || v_raw_token;

  select p.display_name,
         p.email,
         coalesce(p.avatar_url, v_portal_base || '/ksp-email-avatar.svg') as avatar_url,
         coalesce(nullif(p.email_title, ''), 'KSP Dominion Group Team') as email_title,
         coalesce(nullif(p.email_signature, ''), 'KSP Dominion Group') as email_signature
  into v_inviter
  from public.profiles p
  where p.id = new.invited_by;

  if v_inviter.display_name is null then
    v_inviter.display_name := 'KSP Dominion Group';
    v_inviter.email := 'kauan@kspdominion.group';
    v_inviter.avatar_url := v_portal_base || '/ksp-email-avatar.svg';
    v_inviter.email_title := 'Client Success';
    v_inviter.email_signature := 'KSP Dominion Group';
  end if;

  select display_name into v_client_name
  from public.client_organizations
  where id = new.client_organization_id;
  v_client_name := coalesce(v_client_name, 'your client workspace');

  select name into v_recipient_name
  from public.contacts
  where client_id = new.client_organization_id
    and email is not null
    and lower(email) = lower(new.email)
  order by created_at desc
  limit 1;
  v_recipient_name := coalesce(nullif(v_recipient_name, ''), split_part(new.email, '@', 1));

  v_role_label := case new.initial_role::text
    when 'client_owner' then 'Owner'
    when 'client_project_approver' then 'Project Approver'
    when 'client_billing_contact' then 'Billing Contact'
    when 'client_collaborator' then 'Collaborator'
    else 'Viewer'
  end;
  v_expiry := to_char(new.expires_at at time zone 'America/New_York', 'Mon DD, YYYY at HH12:MI AM') || ' ET';

  select
    string_agg(p.name, E'\n' order by p.name),
    string_agg('<tr><td style="padding-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#33343A;">• ' || public.ksp_email_escape_html(p.name) || '</td></tr>', '' order by p.name)
  into v_projects_text, v_projects_html
  from public.projects p
  where p.organization_id = new.organization_id
    and p.client_id = new.client_organization_id
    and p.status <> 'archived';

  v_subject := 'You’re invited to ' || v_client_name || ' · KSP Client Portal';
  v_text :=
    'Hello ' || v_recipient_name || E',\n\n' ||
    v_inviter.display_name || ' invited you to the KSP Client Portal for ' || v_client_name || E'.\n' ||
    'Role: ' || v_role_label || E'\n' ||
    case when v_projects_text is not null then 'Projects included:' || E'\n' || v_projects_text || E'\n' else '' end ||
    'Invitation expires: ' || v_expiry || E'\n\n' ||
    'Accept invitation: ' || v_invite_url || E'\n\n' ||
    E'This is a private, one-time invitation. Do not forward it.\n\n' ||
    v_inviter.display_name || E'\n' || v_inviter.email_title || E'\n' || v_inviter.email_signature;

  v_html := '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title>' || public.ksp_email_escape_html(v_subject) || '</title></head>' ||
    '<body style="margin:0;padding:0;background-color:#F4F3F7;">' ||
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F3F7"><tr><td align="center" style="padding-top:32px;padding-right:16px;padding-bottom:40px;padding-left:16px;">' ||
    '<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">' ||
    '<tr><td bgcolor="#6B1FA6" style="height:5px;background-color:#6B1FA6;font-size:1px;line-height:1px;">&nbsp;</td></tr>' ||
    '<tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-right:1px solid #E6E3EA;border-left:1px solid #E6E3EA;padding-top:30px;padding-right:30px;padding-bottom:30px;padding-left:30px;">' ||
    '<table width="100%" cellpadding="0" cellspacing="0" border="0">' ||
    '<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;font-weight:700;letter-spacing:1.4px;color:#6B1FA6;">KSP CLIENT PORTAL</td></tr>' ||
    '<tr><td style="padding-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#17181D;">You’ve been invited.</td></tr>' ||
    '<tr><td style="padding-top:14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#494A52;">Hello <strong style="color:#17181D;">' || public.ksp_email_escape_html(v_recipient_name) || '</strong>, ' || public.ksp_email_escape_html(v_inviter.display_name) || ' invited you to the secure client workspace for <strong style="color:#17181D;">' || public.ksp_email_escape_html(v_client_name) || '</strong>.</td></tr>' ||
    '<tr><td style="padding-top:22px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F7F2FB" style="background-color:#F7F2FB;border:1px solid #E7D7F3;"><tr><td style="padding-top:16px;padding-right:18px;padding-bottom:16px;padding-left:18px;">' ||
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;font-weight:700;color:#6B1FA6;">ACCESS</td><td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#62636A;">' || public.ksp_email_escape_html(v_role_label) || '</td></tr>' ||
    coalesce('<tr><td colspan="2" style="padding-top:10px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">' || v_projects_html || '</table></td></tr>', '') ||
    '<tr><td colspan="2" style="padding-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#777881;">Expires ' || public.ksp_email_escape_html(v_expiry) || '</td></tr></table>' ||
    '</td></tr></table></td></tr>' ||
    '<tr><td style="padding-top:24px;"><table cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#6B1FA6" style="background-color:#6B1FA6;border-radius:9px;"><a href="' || public.ksp_email_escape_html(v_invite_url) || '" style="display:inline-block;padding-top:13px;padding-right:22px;padding-bottom:13px;padding-left:22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:700;color:#FFFFFF;text-decoration:none;">Accept invitation</a></td></tr></table></td></tr>' ||
    '<tr><td style="padding-top:18px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#787982;">This is a private, one-time invitation. Do not forward this email. KSP will never ask you to send a password by email.</td></tr>' ||
    '<tr><td style="padding-top:28px;border-top:1px solid #ECE9EF;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' ||
    '<td width="64" valign="top"><img src="' || public.ksp_email_escape_html(v_inviter.avatar_url) || '" width="52" height="52" border="0" alt="' || public.ksp_email_escape_html(v_inviter.display_name) || '" style="display:block;width:52px;height:52px;border-radius:26px;"></td>' ||
    '<td valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6B6C74;"><strong style="font-size:13px;color:#17181D;">' || public.ksp_email_escape_html(v_inviter.display_name) || '</strong><br>' || public.ksp_email_escape_html(v_inviter.email_title) || '<br>' || public.ksp_email_escape_html(v_inviter.email_signature) || '<br><a href="mailto:' || public.ksp_email_escape_html(v_inviter.email) || '" style="color:#6B1FA6;text-decoration:none;">' || public.ksp_email_escape_html(v_inviter.email) || '</a></td>' ||
    '</tr></table></td></tr>' ||
    '</table></td></tr>' ||
    '<tr><td bgcolor="#17181D" style="background-color:#17181D;padding-top:17px;padding-right:30px;padding-bottom:17px;padding-left:30px;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:16px;color:#C8C9CE;">KSP Dominion Group · Secure client access · Massachusetts, USA</td></tr>' ||
    '</table></td></tr></table></body></html>';

  v_payload := jsonb_build_object(
    'from', 'KSP Client Portal <portal@mail.kspdominion.group>',
    'to', jsonb_build_array(new.email),
    'reply_to', v_inviter.email,
    'subject', v_subject,
    'text', v_text,
    'html', v_html
  );

  select * into v_response
  from extensions.http((
    'POST',
    'https://api.resend.com/emails',
    array[
      extensions.http_header('Authorization', 'Bearer ' || v_api_key),
      extensions.http_header('Idempotency-Key', 'portal-invite/' || new.id::text || '/' || left(new.email_token_hash, 16))
    ],
    'application/json',
    v_payload::text
  )::extensions.http_request);

  if v_response.status < 200 or v_response.status >= 300 then
    raise exception 'portal_invitation_email_delivery_failed: %', left(coalesce(v_response.content, 'email provider rejected request'), 500);
  end if;

  begin
    v_response_json := v_response.content::jsonb;
    v_message_id := v_response_json ->> 'id';
  exception when others then
    v_message_id := null;
  end;

  if v_message_id is null or v_message_id = '' then
    raise exception 'portal_invitation_email_message_id_missing';
  end if;

  new.email_delivery_status := 'sent';
  new.email_provider_message_id := v_message_id;
  new.email_sent_at := now();
  new.email_last_error := null;
  return new;
end;
$$;
revoke all on function public.ksp_portal_invitation_email_before_insert() from public;

drop trigger if exists portal_invitation_send_email_before_insert on public.portal_invitations;
create trigger portal_invitation_send_email_before_insert
before insert on public.portal_invitations
for each row execute function public.ksp_portal_invitation_email_before_insert();

create or replace function public.preview_portal_invitation(p_token_hash text)
returns table(client_organization_name text, initial_role public.client_role, expires_at timestamptz, status text)
language sql
stable
security definer
set search_path='pg_catalog','public'
as $$
  select
    co.display_name,
    pi.initial_role,
    pi.expires_at,
    case
      when pi.revoked_at is not null then 'revoked'
      when pi.accepted_at is not null then 'accepted'
      when pi.expires_at <= pg_catalog.now() then 'expired'
      else 'ready'
    end
  from public.portal_invitations pi
  join public.client_organizations co on co.id = pi.client_organization_id
  where auth.uid() is not null
    and (pi.token_hash = p_token_hash or pi.email_token_hash = p_token_hash)
  order by pi.created_at desc
  limit 1;
$$;
revoke all on function public.preview_portal_invitation(text) from public;
grant execute on function public.preview_portal_invitation(text) to authenticated;
