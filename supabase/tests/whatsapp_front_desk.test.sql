-- KSP INC WhatsApp AI Front Desk V1 actor, channel and ingress-scope matrix.
-- Runs after the full migration chain and rolls back all fixtures.

begin;

revoke all on public.communication_channels from anon;
revoke all on public.communication_identities from anon;
revoke all on public.communication_conversations from anon;
revoke all on public.communication_events from anon;
revoke all on public.communication_ai_actions from anon;
revoke all on public.communication_outbox from anon;
revoke all on public.communication_consents from anon;

insert into public.organizations(id,name,slug) values
 ('b0000000-0000-0000-0000-000000000001','WhatsApp Front Desk Test Org','whatsapp-front-desk-test'),
 ('b0000000-0000-0000-0000-000000000002','WhatsApp Front Desk Other Org','whatsapp-front-desk-other');

insert into auth.users(id,email,raw_user_meta_data) values
 ('b1000000-0000-0000-0000-000000000001','whatsapp-founder@test.invalid','{"full_name":"WhatsApp Founder"}'::jsonb),
 ('b1000000-0000-0000-0000-000000000002','whatsapp-member@test.invalid','{"full_name":"WhatsApp Member"}'::jsonb);

insert into public.organization_memberships(organization_id,profile_id,role,internal_role,scope) values
 ('b0000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','founder_ceo','founder_ceo','all'),
 ('b0000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000002','developer','developer','assigned');

-- Cross-tenant fixtures are inserted before assuming an authenticated actor so
-- the RLS checks below can prove that owner writes cannot attach foreign rows.
insert into public.communication_identities(
 id,organization_id,channel_kind,normalized_address,display_address,verified
) values (
 'b3000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000002',
 'whatsapp','+15555550202','+1 555 555 0202',true
);

set local role authenticated;
select set_config('request.jwt.claim.sub','b1000000-0000-0000-0000-000000000001',true);

insert into public.communication_channels(
 id,organization_id,channel_key,kind,provider,address,external_ref,status,inbound_enabled,outbound_enabled,created_by
) values (
 'b2000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
 'owner-whatsapp','whatsapp','meta','+15555550100','meta-phone-number-id-1','configured',true,true,'b1000000-0000-0000-0000-000000000001'
);

insert into public.communication_identities(
 id,organization_id,channel_kind,normalized_address,display_address,verified
) values (
 'b3000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
 'whatsapp','+15555550101','+1 555 555 0101',true
);

insert into public.communication_conversations(
 id,organization_id,identity_id,scope,primary_channel,state,assigned_agent_key
) values (
 'b4000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
 'b3000000-0000-0000-0000-000000000001','prospect','whatsapp','open','inc.whatsapp-front-desk'
);

insert into public.communication_events(
 organization_id,conversation_id,channel_id,identity_id,channel_kind,direction,event_type,provider,dedupe_key,body
) values (
 'b0000000-0000-0000-0000-000000000001','b4000000-0000-0000-0000-000000000001',
 'b2000000-0000-0000-0000-000000000001','b3000000-0000-0000-0000-000000000001',
 'whatsapp','inbound','message','meta','whatsapp-test-event-1','hello'
);

do $$ declare c int; begin
 select count(*) into c from public.communication_channels where kind='whatsapp';
 if c<>1 then raise exception 'founder WhatsApp channel write failed: %',c; end if;
 select count(*) into c from public.communication_channels where automation_mode='off';
 if c<>1 then raise exception 'WhatsApp automation must default fail-closed/off: %',c; end if;
 select count(*) into c from public.communication_events where channel_kind='whatsapp';
 if c<>1 then raise exception 'founder WhatsApp event write failed: %',c; end if;

 begin
  insert into public.communication_channels(organization_id,channel_key,kind,provider,created_by)
  values ('b0000000-0000-0000-0000-000000000001','forbidden-voice','voice','test','b1000000-0000-0000-0000-000000000001');
  raise exception 'voice channel unexpectedly allowed';
 exception when check_violation then null; end;

 begin
  insert into public.communication_channels(organization_id,channel_key,kind,provider,created_by)
  values ('b0000000-0000-0000-0000-000000000001','forbidden-sms','sms','test','b1000000-0000-0000-0000-000000000001');
  raise exception 'sms channel unexpectedly allowed';
 exception when check_violation then null; end;

 begin
  insert into public.communication_channels(organization_id,channel_key,kind,provider,created_by)
  values ('b0000000-0000-0000-0000-000000000001','forbidden-email','email','test','b1000000-0000-0000-0000-000000000001');
  raise exception 'email channel unexpectedly allowed';
 exception when check_violation then null; end;

 begin
  insert into public.communication_channels(organization_id,channel_key,kind,provider,automation_mode,created_by)
  values ('b0000000-0000-0000-0000-000000000001','forbidden-automation','whatsapp','meta','always-on','b1000000-0000-0000-0000-000000000001');
  raise exception 'invalid automation mode unexpectedly allowed';
 exception when check_violation then null; end;

 begin
  insert into public.communication_conversations(
    organization_id,identity_id,scope,primary_channel,state,assigned_agent_key
  ) values (
    'b0000000-0000-0000-0000-000000000001','b3000000-0000-0000-0000-000000000002',
    'prospect','whatsapp','open','inc.whatsapp-front-desk'
  );
  raise exception 'cross-organization identity unexpectedly attached to conversation';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Meta phone_number_id/external_ref is globally unique so webhook routing cannot
-- become ambiguous across organizations even when privileged code writes rows.
do $$ begin
 begin
  insert into public.communication_channels(
    organization_id,channel_key,kind,provider,external_ref,status,inbound_enabled
  ) values (
    'b0000000-0000-0000-0000-000000000002','duplicate-meta-route','whatsapp','meta',
    'meta-phone-number-id-1','configured',true
  );
  raise exception 'duplicate provider external_ref unexpectedly allowed';
 exception when unique_violation then null; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','b1000000-0000-0000-0000-000000000002',true);
do $$ declare c int; begin
 select count(*) into c from public.communication_channels;
 if c<>0 then raise exception 'normal internal member reads WhatsApp channels: %',c; end if;
 select count(*) into c from public.communication_conversations;
 if c<>0 then raise exception 'normal internal member reads WhatsApp conversations: %',c; end if;
 begin
  insert into public.communication_channels(organization_id,channel_key,kind,provider)
  values ('b0000000-0000-0000-0000-000000000001','member-must-fail','whatsapp','meta');
  raise exception 'normal internal member created WhatsApp channel';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role anon;
do $$ begin
 begin
  perform 1 from public.communication_events limit 1;
  raise exception 'anon unexpectedly read WhatsApp communication events';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

rollback;
