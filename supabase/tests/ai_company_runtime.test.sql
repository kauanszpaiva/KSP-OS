-- KSP INC AI Company Runtime V1 actor-level RLS matrix.
-- Runs after the full migration chain and rolls back all fixtures.

begin;

-- The generic DB harness grants broad test visibility after migrations. Restore
-- the runtime's production anon posture before asserting the AI Company boundary.
revoke all on public.ai_company_agents from anon;
revoke all on public.ai_company_missions from anon;
revoke all on public.ai_company_tasks from anon;
revoke all on public.ai_company_evidence from anon;
revoke all on public.ai_company_capabilities from anon;
revoke all on public.ai_company_budget_policies from anon;
revoke all on public.ai_company_budget_events from anon;

insert into public.organizations(id,name,slug) values
 ('a0000000-0000-0000-0000-000000000001','AI Company Matrix A','ai-company-matrix-a'),
 ('a0000000-0000-0000-0000-000000000002','AI Company Matrix B','ai-company-matrix-b');

insert into auth.users(id,email,raw_user_meta_data) values
 ('a1000000-0000-0000-0000-000000000001','ai-founder@test.invalid','{"full_name":"AI Founder"}'::jsonb),
 ('a1000000-0000-0000-0000-000000000002','ai-exec@test.invalid','{"full_name":"AI Executive"}'::jsonb),
 ('a1000000-0000-0000-0000-000000000003','ai-member@test.invalid','{"full_name":"AI Member"}'::jsonb),
 ('a1000000-0000-0000-0000-000000000004','ai-other-founder@test.invalid','{"full_name":"AI Other Founder"}'::jsonb);

insert into public.organization_memberships(organization_id,profile_id,role,internal_role,scope) values
 ('a0000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','founder_ceo','founder_ceo','all'),
 ('a0000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','executive_operations','executive_operations','all'),
 ('a0000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000003','developer','developer','assigned'),
 ('a0000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000004','founder_ceo','founder_ceo','all');

insert into public.client_organizations(id,organization_id,legal_name,display_name,created_by) values
 ('a2000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','Client A LLC','Client A','a1000000-0000-0000-0000-000000000001'),
 ('a2000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','Client B LLC','Client B','a1000000-0000-0000-0000-000000000004');

-- Founder may create both INTERNAL and same-org CLIENT missions.
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000001',true);
insert into public.ai_company_missions(
 id,organization_id,title,objective,vertical,plane,status,execution_mode,model_tier,budget_cap_usd,created_by
) values (
 'a3000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',
 'Founder internal mission','Prove owner-only internal mission access.','inc','internal','queued','deterministic_v1','zero_cost',0,
 'a1000000-0000-0000-0000-000000000001'
);
insert into public.ai_company_missions(
 id,organization_id,title,objective,vertical,plane,client_organization_id,status,execution_mode,model_tier,budget_cap_usd,created_by
) values (
 'a3000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001',
 'Founder client mission','Prove same-organization client mission access.','agency','client','a2000000-0000-0000-0000-000000000001',
 'queued','deterministic_v1','zero_cost',0,'a1000000-0000-0000-0000-000000000001'
);

do $$ declare c int; begin
 select count(*) into c from public.ai_company_missions;
 if c<>2 then raise exception 'founder AI mission visibility failed: %',c; end if;
 begin
  insert into public.ai_company_missions(
   organization_id,title,objective,vertical,plane,client_organization_id,status,execution_mode,model_tier,budget_cap_usd,created_by
  ) values (
   'a0000000-0000-0000-0000-000000000001','Cross-org client must fail','Reject cross-organization client scope.','agency','client',
   'a2000000-0000-0000-0000-000000000002','queued','deterministic_v1','zero_cost',0,'a1000000-0000-0000-0000-000000000001'
  );
  raise exception 'cross-organization CLIENT mission unexpectedly allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

-- executive_operations is the second approved KSP INC owner role.
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000002',true);
insert into public.ai_company_capabilities(
 organization_id,capability_key,kind,name,status,cost_class,score,created_by,updated_by
) values (
 'a0000000-0000-0000-0000-000000000001','exec-proof','runtime','Executive proof','active','free',100,
 'a1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000002'
);
do $$ declare c int; begin
 select count(*) into c from public.ai_company_missions;
 if c<>2 then raise exception 'executive owner AI visibility failed: %',c; end if;
 select count(*) into c from public.ai_company_capabilities where capability_key='exec-proof';
 if c<>1 then raise exception 'executive capability write failed: %',c; end if;
end $$;
reset role;

-- Normal internal members cannot read or create AI Company control-plane rows.
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000003',true);
do $$ declare c int; begin
 select count(*) into c from public.ai_company_missions;
 if c<>0 then raise exception 'normal internal member reads AI missions: %',c; end if;
 select count(*) into c from public.ai_company_capabilities;
 if c<>0 then raise exception 'normal internal member reads AI capabilities: %',c; end if;
 begin
  insert into public.ai_company_missions(
   organization_id,title,objective,vertical,plane,status,execution_mode,model_tier,budget_cap_usd,created_by
  ) values (
   'a0000000-0000-0000-0000-000000000001','Member must fail','Reject normal internal mission creation.','inc','internal',
   'queued','deterministic_v1','zero_cost',0,'a1000000-0000-0000-0000-000000000003'
  );
  raise exception 'normal internal member created AI mission';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

-- An owner in another organization sees none of Organization A's AI state.
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000004',true);
do $$ declare c int; begin
 select count(*) into c from public.ai_company_missions;
 if c<>0 then raise exception 'cross-organization owner reads AI missions: %',c; end if;
 select count(*) into c from public.ai_company_capabilities;
 if c<>0 then raise exception 'cross-organization owner reads AI capabilities: %',c; end if;
end $$;
reset role;

-- Anonymous users do not receive table access at all.
set local role anon;
do $$ begin
 begin
  perform 1 from public.ai_company_missions limit 1;
  raise exception 'anon unexpectedly read AI Company missions';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

rollback;
