-- Refresh KSP Client Portal invitation email branding and mobile layout.
-- Keeps the existing secure token flow and Resend delivery path intact.

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
  v_brand_logo text;
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

  v_portal_base := coalesce(nullif(trim(v_portal_base), ''), 'https://kspdominionportal.com');
  v_portal_base := regexp_replace(v_portal_base, '/+$', '');
  v_brand_logo := v_portal_base || '/ksp-email-avatar.svg';
  v_invite_url := v_portal_base || '/invite/' || v_raw_token;

  select p.display_name,
         p.email,
         coalesce(nullif(p.avatar_url, ''), v_brand_logo) as avatar_url,
         coalesce(nullif(p.email_title, ''), 'KSP Dominion Group Team') as email_title,
         coalesce(nullif(p.email_signature, ''), 'KSP Dominion Group') as email_signature
  into v_inviter
  from public.profiles p
  where p.id = new.invited_by;

  if v_inviter.display_name is null then
    v_inviter.display_name := 'KSP Dominion Group';
    v_inviter.email := 'kauan@kspdominion.group';
    v_inviter.avatar_url := v_brand_logo;
    v_inviter.email_title := 'Client Success';
    v_inviter.email_signature := 'KSP Dominion Group';
  end if;

  select display_name into v_client_name
  from public.client_organizations
  where id = new.client_organization_id;
  v_client_name := coalesce(nullif(v_client_name, ''), 'your client workspace');

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
    string_agg(
      '<tr><td style="padding-top:7px;padding-right:0;padding-bottom:0;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#34363D;">' ||
      '<span style="color:#6B1FA6;font-weight:700;">&#8226;</span>&nbsp;&nbsp;' || public.ksp_email_escape_html(p.name) || '</td></tr>',
      '' order by p.name
    )
  into v_projects_text, v_projects_html
  from public.projects p
  where p.organization_id = new.organization_id
    and p.client_id = new.client_organization_id
    and p.status <> 'archived';

  v_subject := 'Your access to ' || v_client_name || ' | KSP Client Portal';

  v_text :=
    'KSP DOMINION GROUP - CLIENT PORTAL' || E'\n\n' ||
    'Hello ' || v_recipient_name || E',\n\n' ||
    v_inviter.display_name || ' invited you to the secure KSP Client Portal workspace for ' || v_client_name || E'.\n\n' ||
    'Workspace: ' || v_client_name || E'\n' ||
    'Access role: ' || v_role_label || E'\n' ||
    case when v_projects_text is not null then 'Projects included:' || E'\n' || v_projects_text || E'\n' else '' end ||
    'Invitation expires: ' || v_expiry || E'\n\n' ||
    'Accept invitation: ' || v_invite_url || E'\n\n' ||
    'This is a private, one-time invitation. Do not forward it. KSP will never ask you to send a password by email.' || E'\n\n' ||
    'Need help? Reply to this email.' || E'\n\n' ||
    v_inviter.display_name || E'\n' || v_inviter.email_title || E'\n' || v_inviter.email_signature || E'\n' || v_inviter.email;

  v_html := '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title>' || public.ksp_email_escape_html(v_subject) || '</title></head>' ||
    '<body style="margin:0;padding:0;background-color:#F2F2F5;">' ||
    '<span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:#F2F2F5;">Secure access invitation for ' || public.ksp_email_escape_html(v_client_name) || '.</span>' ||
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F2F2F5" role="presentation" style="width:100%;background-color:#F2F2F5;">' ||
    '<tr><td align="center" style="padding-top:28px;padding-right:14px;padding-bottom:40px;padding-left:14px;">' ||
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:100%;max-width:620px;">' ||

    '<tr><td bgcolor="#17181D" style="background-color:#17181D;border-top-left-radius:16px;border-top-right-radius:16px;padding-top:22px;padding-right:24px;padding-bottom:22px;padding-left:24px;">' ||
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>' ||
    '<td width="52" valign="middle" style="padding-right:14px;"><img src="' || public.ksp_email_escape_html(v_brand_logo) || '" width="48" height="48" border="0" alt="KSP Dominion Group" style="display:block;width:48px;height:48px;border:0;border-radius:24px;"></td>' ||
    '<td valign="middle" style="font-family:Arial,Helvetica,sans-serif;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:17px;font-weight:800;letter-spacing:1.3px;color:#FFFFFF;">KSP DOMINION GROUP</div><div style="padding-top:3px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#B9BBC3;">Client Portal</div></td>' ||
    '<td align="right" valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:14px;font-weight:800;letter-spacing:0.9px;color:#B6FF41;">SECURE ACCESS</td>' ||
    '</tr></table></td></tr>' ||

    '<tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-right:1px solid #E2E3E8;border-left:1px solid #E2E3E8;padding-top:34px;padding-right:30px;padding-bottom:32px;padding-left:30px;">' ||
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">' ||
    '<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:15px;font-weight:800;letter-spacing:1.5px;color:#6B1FA6;">PRIVATE WORKSPACE INVITATION</td></tr>' ||
    '<tr><td style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:31px;line-height:38px;font-weight:800;letter-spacing:-0.7px;color:#17181D;">Welcome to ' || public.ksp_email_escape_html(v_client_name) || '.</td></tr>' ||
    '<tr><td style="padding-top:14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#51535C;">Hello <strong style="color:#17181D;">' || public.ksp_email_escape_html(v_recipient_name) || '</strong>. ' || public.ksp_email_escape_html(v_inviter.display_name) || ' invited you to a private workspace managed through the KSP Client Portal.</td></tr>' ||

    '<tr><td style="padding-top:24px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F7F6F9" role="presentation" style="background-color:#F7F6F9;border:1px solid #E6E2EA;border-radius:12px;">' ||
    '<tr><td style="padding-top:18px;padding-right:18px;padding-bottom:18px;padding-left:18px;">' ||
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">' ||
    '<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:15px;font-weight:800;letter-spacing:1.1px;color:#7A7C84;">WORKSPACE</td><td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:15px;font-weight:800;letter-spacing:1.1px;color:#7A7C84;">ROLE</td></tr>' ||
    '<tr><td style="padding-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:22px;font-weight:800;color:#17181D;">' || public.ksp_email_escape_html(v_client_name) || '</td><td align="right" style="padding-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;font-weight:700;color:#6B1FA6;">' || public.ksp_email_escape_html(v_role_label) || '</td></tr>' ||
    case when v_projects_html is not null then '<tr><td colspan="2" style="padding-top:16px;border-top:1px solid #E6E2EA;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:15px;font-weight:800;letter-spacing:1.1px;color:#7A7C84;">PROJECTS INCLUDED</div><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">' || v_projects_html || '</table></td></tr>' else '' end ||
    '<tr><td colspan="2" style="padding-top:16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#777983;">Invitation expires <strong style="color:#45474F;">' || public.ksp_email_escape_html(v_expiry) || '</strong></td></tr>' ||
    '</table></td></tr></table></td></tr>' ||

    '<tr><td style="padding-top:24px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td align="center" bgcolor="#6B1FA6" style="background-color:#6B1FA6;border-radius:10px;"><a href="' || public.ksp_email_escape_html(v_invite_url) || '" style="display:block;padding-top:14px;padding-right:20px;padding-bottom:14px;padding-left:20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:21px;font-weight:800;color:#FFFFFF;text-decoration:none;">Accept invitation</a></td></tr></table></td></tr>' ||
    '<tr><td style="padding-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8A8C94;">This link is unique to you and can only be used for this invitation.</td></tr>' ||

    '<tr><td style="padding-top:22px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F8FAF5" role="presentation" style="background-color:#F8FAF5;border-left:3px solid #8ABF2F;"><tr><td style="padding-top:12px;padding-right:14px;padding-bottom:12px;padding-left:14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#5F6259;"><strong style="color:#31342E;">Security note:</strong> this is a private, one-time invitation. Do not forward it. KSP will never ask you to send a password by email.</td></tr></table></td></tr>' ||

    '<tr><td style="padding-top:28px;border-top:1px solid #ECECF0;"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>' ||
    '<td width="62" valign="top" style="padding-right:14px;"><img src="' || public.ksp_email_escape_html(v_inviter.avatar_url) || '" width="52" height="52" border="0" alt="' || public.ksp_email_escape_html(v_inviter.display_name) || '" style="display:block;width:52px;height:52px;border:0;border-radius:26px;"></td>' ||
    '<td valign="middle" style="font-family:Arial,Helvetica,sans-serif;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:800;color:#17181D;">' || public.ksp_email_escape_html(v_inviter.display_name) || '</div><div style="padding-top:2px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6B6D75;">' || public.ksp_email_escape_html(v_inviter.email_title) || '</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6B6D75;">' || public.ksp_email_escape_html(v_inviter.email_signature) || '</div><div style="padding-top:2px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;"><a href="mailto:' || public.ksp_email_escape_html(v_inviter.email) || '" style="color:#6B1FA6;text-decoration:none;">' || public.ksp_email_escape_html(v_inviter.email) || '</a></div></td>' ||
    '</tr></table></td></tr>' ||
    '<tr><td style="padding-top:18px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#8A8C94;">Questions about your access? Reply directly to this email and the KSP team will help.</td></tr>' ||
    '</table></td></tr>' ||

    '<tr><td bgcolor="#17181D" style="background-color:#17181D;border-bottom-left-radius:16px;border-bottom-right-radius:16px;padding-top:17px;padding-right:24px;padding-bottom:17px;padding-left:24px;">' ||
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:16px;color:#C5C7CE;">KSP Dominion Group · Secure client infrastructure</td><td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:16px;color:#FFFFFF;">Massachusetts, USA</td></tr></table>' ||
    '</td></tr>' ||
    '</table></td></tr></table></body></html>';

  v_payload := jsonb_build_object(
    'from', 'KSP Dominion Group <portal@mail.kspdominion.group>',
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
