-- KSP INC AI Company WhatsApp Front Desk V1
-- WhatsApp-only communication ledger for the existing AT&T phone identity.
-- No provider credentials or tokens belong in these tables.
-- Production application and Meta/WhatsApp activation are separately release-gated.

create table if not exists public.communication_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_key text not null,
  kind text not null default 'whatsapp' check (kind = 'whatsapp'),
  provider text not null,
  address text,
  external_ref text,
  status text not null default 'candidate' check (status in ('candidate','configured','active','paused','disabled','error')),
  automation_mode text not null default 'off' check (automation_mode in ('off','observe','draft','autonomous')),
  inbound_enabled boolean not null default false,
  outbound_enabled boolean not null default false,
  capabilities jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, channel_key)
);

create table if not exists public.communication_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  channel_kind text not null default 'whatsapp' check (channel_kind = 'whatsapp'),
  normalized_address text not null,
  display_address text,
  verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, channel_kind, normalized_address)
);

create table if not exists public.communication_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identity_id uuid references public.communication_identities(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  client_organization_id uuid references public.client_organizations(id) on delete set null,
  scope text not null default 'prospect' check (scope in ('prospect','client','internal')),
  primary_channel text not null default 'whatsapp' check (primary_channel = 'whatsapp'),
  state text not null default 'open' check (state in ('open','human_handoff','waiting','closed','blocked')),
  assigned_agent_key text,
  summary text,
  last_event_at timestamptz,
  human_owner_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_conversations_client_scope_check check (
    (scope = 'client' and client_organization_id is not null)
    or (scope <> 'client')
  )
);

create table if not exists public.communication_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.communication_conversations(id) on delete cascade,
  channel_id uuid references public.communication_channels(id) on delete set null,
  identity_id uuid references public.communication_identities(id) on delete set null,
  channel_kind text not null default 'whatsapp' check (channel_kind = 'whatsapp'),
  direction text not null check (direction in ('inbound','outbound','system')),
  event_type text not null check (event_type in ('message','delivery','attachment','consent','handoff','status')),
  provider text not null,
  dedupe_key text not null,
  provider_event_id text,
  subject text,
  body text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, dedupe_key)
);

create table if not exists public.communication_ai_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.communication_conversations(id) on delete cascade,
  source_event_id uuid references public.communication_events(id) on delete set null,
  agent_key text not null,
  action_type text not null check (action_type in ('classify','reply','create_lead','update_crm','create_task','schedule_followup','handoff','block','no_op')),
  status text not null default 'proposed' check (status in ('proposed','approved','queued','executed','blocked','failed','cancelled')),
  risk_level text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  summary text not null,
  requires_human_approval boolean not null default false,
  approved_by uuid references public.profiles(id) on delete set null,
  model_provider text,
  model_name text,
  estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0),
  actual_cost_usd numeric(12,6) not null default 0 check (actual_cost_usd >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create table if not exists public.communication_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.communication_conversations(id) on delete cascade,
  channel_id uuid not null references public.communication_channels(id) on delete restrict,
  ai_action_id uuid references public.communication_ai_actions(id) on delete set null,
  dedupe_key text not null,
  payload jsonb not null,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (organization_id, dedupe_key)
);

create table if not exists public.communication_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identity_id uuid not null references public.communication_identities(id) on delete cascade,
  channel_kind text not null default 'whatsapp' check (channel_kind = 'whatsapp'),
  consent_type text not null,
  status text not null default 'unknown' check (status in ('unknown','granted','denied','revoked')),
  source text,
  evidence_ref text,
  granted_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, identity_id, channel_kind, consent_type)
);

create unique index if not exists communication_channels_provider_ref_uq
  on public.communication_channels (organization_id, provider, external_ref)
  where external_ref is not null;
create index if not exists communication_identities_contact_idx
  on public.communication_identities (organization_id, contact_id);
create index if not exists communication_conversations_recent_idx
  on public.communication_conversations (organization_id, last_event_at desc nulls last, created_at desc);
create index if not exists communication_conversations_contact_idx
  on public.communication_conversations (organization_id, contact_id);
create index if not exists communication_conversations_identity_idx
  on public.communication_conversations (organization_id, identity_id, created_at desc);
create unique index if not exists communication_conversations_active_identity_uq
  on public.communication_conversations (organization_id, identity_id)
  where identity_id is not null and state in ('open','human_handoff','waiting');
create index if not exists communication_events_conversation_idx
  on public.communication_events (conversation_id, occurred_at, id);
create index if not exists communication_events_provider_idx
  on public.communication_events (organization_id, provider, provider_event_id)
  where provider_event_id is not null;
create index if not exists communication_ai_actions_conversation_idx
  on public.communication_ai_actions (conversation_id, created_at desc);
create unique index if not exists communication_ai_actions_source_event_uq
  on public.communication_ai_actions (organization_id, source_event_id, action_type)
  where source_event_id is not null;
create index if not exists communication_outbox_queue_idx
  on public.communication_outbox (organization_id, status, next_attempt_at, created_at)
  where status in ('queued','failed');
create index if not exists communication_outbox_provider_message_idx
  on public.communication_outbox (organization_id, provider_message_id)
  where provider_message_id is not null;
create index if not exists communication_consents_identity_idx
  on public.communication_consents (identity_id, channel_kind, status);

alter table public.communication_channels enable row level security;
alter table public.communication_identities enable row level security;
alter table public.communication_conversations enable row level security;
alter table public.communication_events enable row level security;
alter table public.communication_ai_actions enable row level security;
alter table public.communication_outbox enable row level security;
alter table public.communication_consents enable row level security;

revoke all on public.communication_channels from anon;
revoke all on public.communication_identities from anon;
revoke all on public.communication_conversations from anon;
revoke all on public.communication_events from anon;
revoke all on public.communication_ai_actions from anon;
revoke all on public.communication_outbox from anon;
revoke all on public.communication_consents from anon;

grant select, insert, update, delete on public.communication_channels to authenticated;
grant select, insert, update, delete on public.communication_identities to authenticated;
grant select, insert, update, delete on public.communication_conversations to authenticated;
grant select, insert, update, delete on public.communication_events to authenticated;
grant select, insert, update, delete on public.communication_ai_actions to authenticated;
grant select, insert, update, delete on public.communication_outbox to authenticated;
grant select, insert, update, delete on public.communication_consents to authenticated;

create policy communication_channels_owner_all on public.communication_channels
  for all to authenticated
  using (public.is_executive(communication_channels.organization_id))
  with check (public.is_executive(communication_channels.organization_id));

create policy communication_identities_owner_all on public.communication_identities
  for all to authenticated
  using (public.is_executive(communication_identities.organization_id))
  with check (
    public.is_executive(communication_identities.organization_id)
    and (
      communication_identities.contact_id is null
      or exists (
        select 1 from public.contacts c
        where c.id = communication_identities.contact_id
          and c.organization_id = communication_identities.organization_id
      )
    )
  );

create policy communication_conversations_owner_all on public.communication_conversations
  for all to authenticated
  using (public.is_executive(communication_conversations.organization_id))
  with check (
    public.is_executive(communication_conversations.organization_id)
    and (
      communication_conversations.identity_id is null
      or exists (
        select 1 from public.communication_identities i
        where i.id = communication_conversations.identity_id
          and i.organization_id = communication_conversations.organization_id
      )
    )
    and (
      communication_conversations.contact_id is null
      or exists (
        select 1 from public.contacts c
        where c.id = communication_conversations.contact_id
          and c.organization_id = communication_conversations.organization_id
      )
    )
    and (
      communication_conversations.lead_id is null
      or exists (
        select 1 from public.leads l
        where l.id = communication_conversations.lead_id
          and l.organization_id = communication_conversations.organization_id
      )
    )
    and (
      communication_conversations.client_organization_id is null
      or exists (
        select 1 from public.client_organizations co
        where co.id = communication_conversations.client_organization_id
          and co.organization_id = communication_conversations.organization_id
          and co.archived_at is null
      )
    )
  );

create policy communication_events_owner_all on public.communication_events
  for all to authenticated
  using (public.is_executive(communication_events.organization_id))
  with check (
    public.is_executive(communication_events.organization_id)
    and exists (
      select 1 from public.communication_conversations c
      where c.id = communication_events.conversation_id
        and c.organization_id = communication_events.organization_id
    )
    and (
      communication_events.channel_id is null
      or exists (
        select 1 from public.communication_channels ch
        where ch.id = communication_events.channel_id
          and ch.organization_id = communication_events.organization_id
          and ch.kind = 'whatsapp'
      )
    )
    and (
      communication_events.identity_id is null
      or exists (
        select 1 from public.communication_identities i
        where i.id = communication_events.identity_id
          and i.organization_id = communication_events.organization_id
          and i.channel_kind = 'whatsapp'
      )
    )
  );

create policy communication_ai_actions_owner_all on public.communication_ai_actions
  for all to authenticated
  using (public.is_executive(communication_ai_actions.organization_id))
  with check (
    public.is_executive(communication_ai_actions.organization_id)
    and exists (
      select 1 from public.communication_conversations c
      where c.id = communication_ai_actions.conversation_id
        and c.organization_id = communication_ai_actions.organization_id
    )
    and (
      communication_ai_actions.source_event_id is null
      or exists (
        select 1 from public.communication_events e
        where e.id = communication_ai_actions.source_event_id
          and e.organization_id = communication_ai_actions.organization_id
          and e.conversation_id = communication_ai_actions.conversation_id
      )
    )
  );

create policy communication_outbox_owner_all on public.communication_outbox
  for all to authenticated
  using (public.is_executive(communication_outbox.organization_id))
  with check (
    public.is_executive(communication_outbox.organization_id)
    and exists (
      select 1 from public.communication_conversations c
      where c.id = communication_outbox.conversation_id
        and c.organization_id = communication_outbox.organization_id
    )
    and exists (
      select 1 from public.communication_channels ch
      where ch.id = communication_outbox.channel_id
        and ch.organization_id = communication_outbox.organization_id
        and ch.kind = 'whatsapp'
    )
    and (
      communication_outbox.ai_action_id is null
      or exists (
        select 1 from public.communication_ai_actions a
        where a.id = communication_outbox.ai_action_id
          and a.organization_id = communication_outbox.organization_id
          and a.conversation_id = communication_outbox.conversation_id
      )
    )
  );

create policy communication_consents_owner_all on public.communication_consents
  for all to authenticated
  using (public.is_executive(communication_consents.organization_id))
  with check (
    public.is_executive(communication_consents.organization_id)
    and exists (
      select 1 from public.communication_identities i
      where i.id = communication_consents.identity_id
        and i.organization_id = communication_consents.organization_id
        and i.channel_kind = 'whatsapp'
    )
  );

comment on table public.communication_channels is 'WhatsApp-only provider connection for the KSP INC AI Company Front Desk. The existing AT&T number may remain the public phone identity; carrier credentials do not belong here.';
comment on column public.communication_channels.automation_mode is 'off=no AI action; observe=classify only; draft=reply requires human approval; autonomous=eligible low-risk replies may be queued by approved runtime policy.';
comment on table public.communication_events is 'Canonical normalized WhatsApp event ledger. Provider webhooks must be signature-verified, deduplicated and minimized before persistence.';
comment on table public.communication_outbox is 'WhatsApp outbound queue. Provider credentials remain in approved secret storage and never in payload or metadata.';
comment on table public.communication_consents is 'WhatsApp consent evidence. Policy enforcement occurs before outbound execution.';
