import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const testFiles = fs.readdirSync('supabase/tests').filter((file) => file.endsWith('.sql'));
if (!testFiles.length) throw new Error('no supabase sql tests found');

const required = [
  'cross-organization denial',
  'cross-client denial',
  'cross-project denial',
  'internal-note protection',
  'finance protection',
  'client publication protection',
  'no self-approval',
  'expired access denial',
  'suspended access denial'
];
const combined = testFiles.map((file) => fs.readFileSync(`supabase/tests/${file}`, 'utf8')).join('\n');
const missing = required.filter((term) => !combined.includes(term));
if (missing.length) {
  console.error('Supabase test plan is missing coverage terms:', missing);
  process.exit(1);
}

function run(command, args, { input, allowFailure = false, encoding = 'utf8' } = {}) {
  const result = spawnSync(command, args, {
    input,
    encoding,
    maxBuffer: 128 * 1024 * 1024,
    stdio: input === undefined ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe']
  });
  if (!allowFailure && result.status !== 0) {
    const stdout = typeof result.stdout === 'string' ? result.stdout : '';
    const stderr = typeof result.stderr === 'string' ? result.stderr : '';
    throw new Error(`${command} ${args.join(' ')} failed (${result.status})\n${stdout}\n${stderr}`);
  }
  return result;
}

const docker = run('docker', ['version'], { allowFailure: true });
if (docker.status !== 0) {
  if (process.env.CI) throw new Error('Docker is required for CI database behavior tests.');
  console.log(`Found ${testFiles.length} Supabase SQL test plan file(s). Docker unavailable; behavioral DB rehearsal skipped outside CI.`);
  process.exit(0);
}

const containerName = `ksp-os-db-test-${process.pid}-${Date.now()}`;
const image = 'postgres:17.6';
const migrations = fs.readdirSync('supabase/migrations').filter((file) => file.endsWith('.sql')).sort();
const reconciliationName = '202608130001_runtime_reconciliation.sql';
const reconciliation = fs.readFileSync(`supabase/migrations/${reconciliationName}`, 'utf8');
if (!migrations.includes(reconciliationName)) throw new Error(`${reconciliationName} missing`);

function dockerExec(args, options = {}) {
  return run('docker', ['exec', ...args], options);
}
function psql(db, sql, options = {}) {
  return dockerExec(['-i', containerName, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', db], {
    input: sql,
    ...options
  });
}
function createDb(name) {
  dockerExec([containerName, 'createdb', '-U', 'postgres', name]);
}
function bootstrapDb(name) {
  psql(name, `
    create schema auth;
    create table auth.users (id uuid primary key, email text unique);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
}
function applyMigration(db, file) {
  psql(db, fs.readFileSync(`supabase/migrations/${file}`, 'utf8'));
}
function applyMigrations(db, files) {
  for (const file of files) applyMigration(db, file);
}
function grantAppTableAccess(db) {
  psql(db, `
    grant usage on schema public to anon, authenticated;
    grant select on all tables in schema public to anon;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    grant usage, select on all sequences in schema public to authenticated;
  `);
}
function verifyReconciliation(db) {
  const result = psql(db, `
    select case when
      to_regclass('public.client_meetings') is not null
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='start_date')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='mission_milestones' and column_name='start_date')
      and exists (select 1 from pg_constraint where conname='tasks_start_before_due' and conrelid='public.tasks'::regclass)
      and exists (select 1 from pg_constraint where conname='mission_milestones_start_before_due' and conrelid='public.mission_milestones'::regclass)
      and exists (select 1 from pg_policies where schemaname='public' and tablename='change_orders' and policyname='change_orders_portal_read')
      and exists (select 1 from pg_policies where schemaname='public' and tablename='organization_memberships' and policyname='organization_memberships_executive_update')
      and exists (select 1 from pg_policies where schemaname='public' and tablename='documents' and policyname='documents_portal_read')
      and exists (select 1 from pg_policies where schemaname='public' and tablename='client_meetings' and policyname='client_meetings_portal_read')
      and exists (select 1 from pg_proc where oid='public.preview_portal_invitation(text)'::regprocedure and prosecdef)
    then 'reconciliation-ok' else 'reconciliation-missing' end;
  `);
  if (!result.stdout.includes('reconciliation-ok')) throw new Error(`Reconciliation verification failed for ${db}`);
}

const clusterBootstrap = `
  do $$ begin
    if not exists (select 1 from pg_roles where rolname='anon') then execute 'create role anon nologin'; end if;
    if not exists (select 1 from pg_roles where rolname='authenticated') then execute 'create role authenticated nologin'; end if;
  end $$;
`;

const actorTests = `
  insert into auth.users (id, email) values
    ('20000000-0000-0000-0000-000000000001', 'founder@test.invalid'),
    ('20000000-0000-0000-0000-000000000002', 'member@test.invalid'),
    ('20000000-0000-0000-0000-000000000003', 'client-a@test.invalid'),
    ('20000000-0000-0000-0000-000000000004', 'client-b@test.invalid'),
    ('20000000-0000-0000-0000-000000000005', 'other-org@test.invalid');

  insert into profiles (id, display_name, email) values
    ('20000000-0000-0000-0000-000000000001', 'Founder Test', 'founder@test.invalid'),
    ('20000000-0000-0000-0000-000000000002', 'Member Test', 'member@test.invalid'),
    ('20000000-0000-0000-0000-000000000003', 'Client A Test', 'client-a@test.invalid'),
    ('20000000-0000-0000-0000-000000000004', 'Client B Test', 'client-b@test.invalid'),
    ('20000000-0000-0000-0000-000000000005', 'Other Org Test', 'other-org@test.invalid');

  insert into organizations (id, name, slug) values
    ('10000000-0000-0000-0000-000000000001', 'Runtime Reconciliation Test Org', 'runtime-reconciliation-test'),
    ('10000000-0000-0000-0000-000000000002', 'Other Tenant Test Org', 'other-tenant-test');

  insert into organization_memberships (organization_id, profile_id, role, internal_role, scope) values
    ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'founder_ceo', 'founder_ceo', 'all'),
    ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'developer', 'developer', 'assigned'),
    ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005', 'developer', 'developer', 'assigned');

  insert into client_organizations (id, organization_id, legal_name, display_name) values
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Client A LLC', 'Client A'),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Client B LLC', 'Client B'),
    ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Other Tenant Client LLC', 'Other Tenant Client');

  insert into client_memberships (organization_id, client_organization_id, profile_id, role) values
    ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'client_owner'),
    ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 'client_owner');

  insert into projects (id, organization_id, client_id, name, project_type) values
    ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Client A Project', 'test'),
    ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Client B Project', 'test');

  insert into documents (organization_id, client_id, title, storage_path, classification, client_visible, status) values
    ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'doc-a-public', '/test/a-public', 'public', true, 'active'),
    ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'doc-a-confidential', '/test/a-confidential', 'confidential', true, 'active'),
    ('10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', 'doc-other-tenant', '/test/other', 'public', true, 'active');

  insert into change_orders (organization_id, client_organization_id, project_id, created_by) values
    ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
    ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001');

  insert into client_meetings (organization_id, client_organization_id, project_id, title, scheduled_at, created_by) values
    ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'meeting-a', now() + interval '1 day', '20000000-0000-0000-0000-000000000001'),
    ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'meeting-b', now() + interval '1 day', '20000000-0000-0000-0000-000000000001');

  insert into portal_invitations (organization_id, client_organization_id, email, initial_role, invited_by, token_hash, expires_at) values
    ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'client-a@test.invalid', 'client_owner', '20000000-0000-0000-0000-000000000001', 'runtime-reconciliation-token-hash', now() + interval '1 day');

  insert into contacts (id, organization_id, client_id, name) values
    ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Delete Policy Test');

  begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
    do $$ declare c int; s text; begin
      select count(*) into c from documents; if c <> 1 then raise exception 'client document isolation failed: %', c; end if;
      select count(*) into c from change_orders; if c <> 1 then raise exception 'client change-order isolation failed: %', c; end if;
      select count(*) into c from client_meetings; if c <> 1 then raise exception 'client meeting isolation failed: %', c; end if;
      select status into s from preview_portal_invitation('runtime-reconciliation-token-hash'); if s <> 'pending' then raise exception 'invitation preview failed: %', s; end if;
    end $$;
  rollback;

  begin;
    set local role anon;
    select set_config('request.jwt.claim.sub', '', true);
    do $$ declare c int; begin
      select count(*) into c from client_meetings; if c <> 0 then raise exception 'anonymous meeting isolation failed: %', c; end if;
      if has_function_privilege('anon', 'preview_portal_invitation(text)', 'execute') then raise exception 'anon can execute invitation preview'; end if;
    end $$;
  rollback;

  begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
    do $$ declare c int; begin
      select count(*) into c from client_organizations where organization_id='10000000-0000-0000-0000-000000000002'::uuid; if c <> 0 then raise exception 'cross-organization read allowed'; end if;
      with u as (update organization_memberships set scope='tampered' where profile_id='20000000-0000-0000-0000-000000000001'::uuid returning 1) select count(*) into c from u; if c <> 0 then raise exception 'non-executive membership update allowed'; end if;
      with d as (delete from contacts where id='50000000-0000-0000-0000-000000000001'::uuid returning 1) select count(*) into c from d; if c <> 0 then raise exception 'non-executive delete allowed'; end if;
    end $$;
  rollback;

  begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
    do $$ declare c int; begin
      with u as (update organization_memberships set scope='exec-updated' where profile_id='20000000-0000-0000-0000-000000000002'::uuid returning 1) select count(*) into c from u; if c <> 1 then raise exception 'executive membership update denied'; end if;
      with d as (delete from contacts where id='50000000-0000-0000-0000-000000000001'::uuid returning 1) select count(*) into c from d; if c <> 1 then raise exception 'executive delete denied'; end if;
    end $$;
  rollback;

  do $$ begin
    begin
      insert into tasks (organization_id, title, start_date, due_date)
      values ('10000000-0000-0000-0000-000000000001', 'invalid range', date '2026-08-20', date '2026-08-10');
      raise exception 'task date constraint did not fire';
    exception when check_violation then null; end;

    begin
      update organization_memberships set internal_role='developer'
      where organization_id='10000000-0000-0000-0000-000000000001'::uuid
        and profile_id='20000000-0000-0000-0000-000000000001'::uuid;
      raise exception 'last-founder trigger did not fire';
    exception when others then
      if sqlerrm not like '%cannot remove the last active founder_ceo%' then raise; end if;
    end;
  end $$;

  -- Founder OS private isolation. Seed founder-owned private rows as the
  -- table owner (RLS bypassed here), then assert the access matrix under RLS.
  insert into founder_inbox_items (organization_id, owner_id, item_type, title)
    values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'idea', 'founder-private-capture');
  insert into founder_tasks (organization_id, owner_id, title)
    values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'founder-private-task');
  insert into founder_promotions (organization_id, owner_id, source_table, source_id, target_table, target_id)
    values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'founder_inbox_items', gen_random_uuid(), 'commitments', gen_random_uuid());

  -- Founder reads their own private rows.
  begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
    do $$ declare c int; begin
      select count(*) into c from founder_inbox_items; if c <> 1 then raise exception 'founder inbox self-read failed: %', c; end if;
      select count(*) into c from founder_tasks; if c <> 1 then raise exception 'founder task self-read failed: %', c; end if;
      select count(*) into c from founder_promotions; if c <> 1 then raise exception 'founder promotion self-read failed: %', c; end if;
    end $$;
  rollback;

  -- Normal team member: zero rows, and inserts denied (own owner_id or impersonated).
  begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
    do $$ declare c int; begin
      select count(*) into c from founder_inbox_items; if c <> 0 then raise exception 'member sees founder inbox: %', c; end if;
      select count(*) into c from founder_tasks; if c <> 0 then raise exception 'member sees founder tasks: %', c; end if;
      select count(*) into c from founder_promotions; if c <> 0 then raise exception 'member sees founder promotions: %', c; end if;
      begin
        insert into founder_inbox_items (organization_id, owner_id, item_type, title)
        values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'note', 'member-hack');
        raise exception 'member insert (own owner) was allowed';
      exception when insufficient_privilege then null; end;
      begin
        insert into founder_inbox_items (organization_id, owner_id, item_type, title)
        values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'note', 'member-impersonate');
        raise exception 'member insert (impersonated owner) was allowed';
      exception when insufficient_privilege then null; end;
      with u as (update founder_tasks set title='tamper' where owner_id='20000000-0000-0000-0000-000000000001'::uuid returning 1)
        select count(*) into c from u; if c <> 0 then raise exception 'member update on founder task allowed'; end if;
      with d as (delete from founder_inbox_items where owner_id='20000000-0000-0000-0000-000000000001'::uuid returning 1)
        select count(*) into c from d; if c <> 0 then raise exception 'member delete on founder inbox allowed'; end if;
    end $$;
  rollback;

  -- Anonymous principal: zero rows.
  begin;
    set local role anon;
    select set_config('request.jwt.claim.sub', '', true);
    do $$ declare c int; begin
      select count(*) into c from founder_inbox_items; if c <> 0 then raise exception 'anon sees founder inbox: %', c; end if;
      select count(*) into c from founder_tasks; if c <> 0 then raise exception 'anon sees founder tasks: %', c; end if;
    end $$;
  rollback;

  -- Founder of a DIFFERENT org: is a founder, but not of the KSP org.
  begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000005', true);
    do $$ declare c int; begin
      select count(*) into c from founder_inbox_items; if c <> 0 then raise exception 'other-org founder sees KSP inbox: %', c; end if;
      begin
        insert into founder_inbox_items (organization_id, owner_id, item_type, title)
        values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'note', 'cross-org');
        raise exception 'other-org founder insert into KSP org was allowed';
      exception when insufficient_privilege then null; end;
    end $$;
  rollback;

  -- Founder-private invariants.
  do $$ begin
    begin
      insert into founder_tasks (organization_id, owner_id, title, status)
      values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'w', 'waiting');
      raise exception 'waiting-task context constraint did not fire';
    exception when check_violation then null; end;
    begin
      insert into founder_inbox_items (organization_id, owner_id, item_type, title)
      values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'bogus', 'x');
      raise exception 'item_type constraint did not fire';
    exception when check_violation then null; end;
  end $$;
`;

try {
  run('docker', ['run', '--name', containerName, '-e', 'POSTGRES_PASSWORD=postgres', '-d', image]);

  let ready = false;
  for (let i = 0; i < 40; i += 1) {
    const probe = dockerExec([containerName, 'pg_isready', '-U', 'postgres', '-d', 'postgres'], { allowFailure: true });
    if (probe.status === 0) { ready = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('PostgreSQL test container did not become ready.');

  psql('postgres', clusterBootstrap);

  createDb('full_chain');
  bootstrapDb('full_chain');
  applyMigrations('full_chain', migrations);
  verifyReconciliation('full_chain');
  psql('full_chain', reconciliation);
  verifyReconciliation('full_chain');

  createDb('drift');
  bootstrapDb('drift');
  const driftBaseline = migrations.filter((file) => file < '202607230008_portal_approvals_requests.sql');
  applyMigrations('drift', driftBaseline);

  psql('drift', `begin;\n${reconciliation}\nrollback;`);
  const rollbackProbe = psql('drift', `select case when to_regclass('public.client_meetings') is null and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='start_date') then 'rollback-ok' else 'rollback-failed' end;`);
  if (!rollbackProbe.stdout.includes('rollback-ok')) throw new Error('Transactional rollback rehearsal failed.');

  psql('drift', reconciliation);
  verifyReconciliation('drift');
  psql('drift', reconciliation);
  verifyReconciliation('drift');
  grantAppTableAccess('drift');
  psql('drift', actorTests);

  psql('drift', `insert into organizations (name, slug) values ('Recovery Marker', 'runtime-recovery-marker');`);
  const dump = dockerExec([containerName, 'pg_dump', '-U', 'postgres', '-d', 'drift', '-Fc'], { encoding: null }).stdout;
  createDb('recovery');
  dockerExec(['-i', containerName, 'pg_restore', '-U', 'postgres', '-d', 'recovery', '--no-owner', '--no-privileges'], { input: dump });
  const recoveryProbe = psql('recovery', `select count(*) from organizations where slug='runtime-recovery-marker';`);
  if (!recoveryProbe.stdout.match(/\b1\b/)) throw new Error('Backup/restore rehearsal did not recover the marker row.');

  console.log(`Behavioral DB rehearsal passed on ${image}: full chain, production-like drift reconciliation, idempotence, rollback, actor-level RLS, tenant/client isolation, invariants, and backup/restore.`);
} finally {
  run('docker', ['rm', '-f', containerName], { allowFailure: true });
}
