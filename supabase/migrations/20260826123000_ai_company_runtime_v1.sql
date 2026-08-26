-- KSP INC AI Company Runtime V1
-- Additive owner-only control plane. No model/provider credential is stored here.

create table if not exists public.ai_company_agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_key text not null,
  name text not null,
  rank text not null check (rank in ('super_ultra','super','ultra','agent','sub_agent')),
  vertical text not null check (vertical in ('inc','dominion','dev','agency','studios','ventures','experiences')),
  plane text not null check (plane in ('internal','client','shared_safe')),
  mandate text not null,
  parent_agent_key text,
  model_tier text not null default 'local_free',
  capabilities jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active','paused','retired','candidate')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, agent_key)
);

create table if not exists public.ai_company_missions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  objective text not null check (char_length(objective) between 10 and 6000),
  vertical text not null check (vertical in ('inc','dominion','dev','agency','studios','ventures','experiences')),
  plane text not null check (plane in ('internal','client')),
  client_organization_id uuid references public.client_organizations(id) on delete restrict,
  status text not null default 'queued' check (status in ('queued','running','review','done','blocked','failed','cancelled')),
  execution_mode text not null default 'deterministic_v1',
  model_tier text not null default 'zero_cost',
  budget_cap_usd numeric(12,6) not null default 0 check (budget_cap_usd >= 0),
  actual_cost_usd numeric(12,6) not null default 0 check (actual_cost_usd >= 0),
  output text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_company_missions_plane_scope check (
    (plane = 'internal' and client_organization_id is null)
    or (plane = 'client' and client_organization_id is not null)
  )
);

create table if not exists public.ai_company_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.ai_company_missions(id) on delete cascade,
  task_key text not null,
  title text not null,
  objective text not null,
  agent_key text not null,
  rank text not null check (rank in ('super_ultra','super','ultra','agent','sub_agent')),
  status text not null default 'queued' check (status in ('queued','running','review','done','blocked','failed','cancelled')),
  parallel_group integer not null default 1 check (parallel_group > 0),
  depends_on_task_keys text[] not null default '{}'::text[],
  result text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mission_id, task_key)
);

create table if not exists public.ai_company_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.ai_company_missions(id) on delete cascade,
  task_id uuid references public.ai_company_tasks(id) on delete cascade,
  evidence_type text not null,
  summary text not null,
  source_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_company_capabilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  capability_key text not null,
  kind text not null,
  name text not null,
  status text not null default 'research' check (status in ('research','candidate','sandbox','canary','active','rejected','retired')),
  cost_class text not null default 'unknown',
  score numeric(6,2) not null default 0,
  source_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, capability_key)
);

create table if not exists public.ai_company_budget_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  hard_cap_usd numeric(12,6) not null check (hard_cap_usd >= 0),
  active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period_start, period_end),
  check (period_end >= period_start)
);

create table if not exists public.ai_company_budget_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid references public.ai_company_missions(id) on delete set null,
  task_id uuid references public.ai_company_tasks(id) on delete set null,
  event_type text not null check (event_type in ('estimate','reservation','usage','credit','adjustment')),
  provider text,
  model text,
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  estimated_usd numeric(12,6) not null default 0 check (estimated_usd >= 0),
  actual_usd numeric(12,6) not null default 0 check (actual_usd >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ai_company_missions_org_created_idx on public.ai_company_missions (organization_id, created_at desc);
create index if not exists ai_company_missions_client_idx on public.ai_company_missions (client_organization_id) where client_organization_id is not null;
create index if not exists ai_company_tasks_mission_group_idx on public.ai_company_tasks (mission_id, parallel_group, task_key);
create index if not exists ai_company_evidence_mission_idx on public.ai_company_evidence (mission_id, created_at);
create index if not exists ai_company_budget_events_org_created_idx on public.ai_company_budget_events (organization_id, created_at desc);

alter table public.ai_company_agents enable row level security;
alter table public.ai_company_missions enable row level security;
alter table public.ai_company_tasks enable row level security;
alter table public.ai_company_evidence enable row level security;
alter table public.ai_company_capabilities enable row level security;
alter table public.ai_company_budget_policies enable row level security;
alter table public.ai_company_budget_events enable row level security;

revoke all on public.ai_company_agents from anon;
revoke all on public.ai_company_missions from anon;
revoke all on public.ai_company_tasks from anon;
revoke all on public.ai_company_evidence from anon;
revoke all on public.ai_company_capabilities from anon;
revoke all on public.ai_company_budget_policies from anon;
revoke all on public.ai_company_budget_events from anon;

grant select, insert, update, delete on public.ai_company_agents to authenticated;
grant select, insert, update, delete on public.ai_company_missions to authenticated;
grant select, insert, update, delete on public.ai_company_tasks to authenticated;
grant select, insert, update, delete on public.ai_company_evidence to authenticated;
grant select, insert, update, delete on public.ai_company_capabilities to authenticated;
grant select, insert, update, delete on public.ai_company_budget_policies to authenticated;
grant select, insert, update, delete on public.ai_company_budget_events to authenticated;

create policy ai_company_agents_owner_all on public.ai_company_agents
  for all to authenticated
  using (public.is_executive(ai_company_agents.organization_id))
  with check (public.is_executive(ai_company_agents.organization_id));

create policy ai_company_missions_owner_all on public.ai_company_missions
  for all to authenticated
  using (public.is_executive(ai_company_missions.organization_id))
  with check (
    public.is_executive(ai_company_missions.organization_id)
    and (
      (ai_company_missions.plane = 'internal' and ai_company_missions.client_organization_id is null)
      or (
        ai_company_missions.plane = 'client'
        and ai_company_missions.client_organization_id is not null
        and exists (
          select 1 from public.client_organizations co
          where co.id = ai_company_missions.client_organization_id
            and co.organization_id = ai_company_missions.organization_id
            and co.archived_at is null
        )
      )
    )
  );

create policy ai_company_tasks_owner_all on public.ai_company_tasks
  for all to authenticated
  using (public.is_executive(ai_company_tasks.organization_id))
  with check (
    public.is_executive(ai_company_tasks.organization_id)
    and exists (
      select 1 from public.ai_company_missions m
      where m.id = ai_company_tasks.mission_id
        and m.organization_id = ai_company_tasks.organization_id
    )
  );

create policy ai_company_evidence_owner_all on public.ai_company_evidence
  for all to authenticated
  using (public.is_executive(ai_company_evidence.organization_id))
  with check (
    public.is_executive(ai_company_evidence.organization_id)
    and exists (
      select 1 from public.ai_company_missions m
      where m.id = ai_company_evidence.mission_id
        and m.organization_id = ai_company_evidence.organization_id
    )
  );

create policy ai_company_capabilities_owner_all on public.ai_company_capabilities
  for all to authenticated
  using (public.is_executive(ai_company_capabilities.organization_id))
  with check (public.is_executive(ai_company_capabilities.organization_id));

create policy ai_company_budget_policies_owner_all on public.ai_company_budget_policies
  for all to authenticated
  using (public.is_executive(ai_company_budget_policies.organization_id))
  with check (public.is_executive(ai_company_budget_policies.organization_id));

create policy ai_company_budget_events_owner_all on public.ai_company_budget_events
  for all to authenticated
  using (public.is_executive(ai_company_budget_events.organization_id))
  with check (
    public.is_executive(ai_company_budget_events.organization_id)
    and (ai_company_budget_events.mission_id is null or exists (
      select 1 from public.ai_company_missions m
      where m.id = ai_company_budget_events.mission_id
        and m.organization_id = ai_company_budget_events.organization_id
    ))
  );
