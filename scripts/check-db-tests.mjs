import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const container = `ksp-os-db-test-${process.pid}-${Date.now()}`;
const hostPort = String(54000 + (process.pid % 1000));
const postgresPassword = 'ksp-test-password';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
    input: options.input,
    maxBuffer: 16 * 1024 * 1024,
    ...options
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed (${result.status})\n${stdout}\n${stderr}`);
  }
  return { stdout, stderr };
}
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function waitForPostgres() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = spawnSync('docker', ['exec', container, 'pg_isready', '-U', 'postgres'], { encoding: 'utf8' });
    if (result.status === 0) return;
    await sleep(500);
  }
  throw new Error('PostgreSQL did not become ready');
}
function dockerExec(args, input) {
  return run('docker', ['exec', '-i', container, ...args], { input });
}
function psql(db, sql) {
  return dockerExec(['psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', db], sql);
}
function createdb(db) { dockerExec(['createdb', '-U', 'postgres', db]); }
function dropdb(db) { spawnSync('docker', ['exec', container, 'dropdb', '-U', 'postgres', '--if-exists', db], { encoding: 'utf8' }); }
function pgDump(db, file) {
  const result = spawnSync('docker', ['exec', container, 'pg_dump', '-U', 'postgres', '--format=custom', db], {
    encoding: null,
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.status !== 0) throw new Error(`pg_dump failed: ${(result.stderr ?? Buffer.alloc(0)).toString()}`);
  fs.writeFileSync(file, result.stdout);
}
function pgRestore(db, file) {
  const result = spawnSync('docker', ['exec', '-i', container, 'pg_restore', '-U', 'postgres', '-d', db], {
    input: fs.readFileSync(file),
    encoding: null,
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.status !== 0) throw new Error(`pg_restore failed: ${(result.stderr ?? Buffer.alloc(0)).toString()}`);
}
function bootstrap(db) {
  psql(db, `
    create schema auth;
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table auth.users (
      id uuid primary key,
      email text,
      created_at timestamptz not null default now()
    );

    -- Minimal Supabase Storage catalog used only by the Docker rehearsal.
    create schema storage;
    create table storage.buckets (
      id text primary key,
      name text not null unique,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table storage.objects (
      id bigint generated always as identity primary key,
      bucket_id text not null references storage.buckets(id),
      name text not null,
      metadata jsonb not null default '{}',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (bucket_id, name)
    );
    alter table storage.objects enable row level security;
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

    grant usage on schema storage to anon, authenticated;
    grant select on storage.buckets to anon, authenticated;
    grant select on storage.objects to anon;
    grant select, insert, update, delete on storage.objects to authenticated;
    grant usage, select on all sequences in schema storage to authenticated;
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
    if not exists (select 1 from pg_roles where rolname='service_role') then execute 'create role service_role nologin'; end if;
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
    ('10000000-0000-0000-0000-000000000001', 'Test Org', 'test-org'),
    ('10000000-0000-0000-0000-000000000002', 'Other Org', 'other-org');

  insert into organization_memberships (organization_id, profile_id, role, internal_role, scope) values
    ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'founder_ceo', 'founder_ceo', 'all'),
    ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'developer', 'developer', 'assigned'),
    ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005', 'founder_ceo', 'founder_ceo', 'all');

  insert into client_organizations (id, organization_id, legal_name, display_name) values
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Client A LLC', 'Client A'),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Client B LLC', 'Client B');

  insert into client_memberships (organization_id, client_organization_id, profile_id, role) values
    ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'client_owner'),
    ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 'client_owner');

  insert into projects (id, organization_id, client_id, name, project_type) values
    ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Client A Project', 'test'),
    ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Client B Project', 'test');

  insert into project_memberships (organization_id, project_id, profile_id, role) values
    ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'founder_ceo'),
    ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'developer');

  insert into project_access_grants (organization_id, project_id, client_organization_id, profile_id, action) values
    ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'project.read'),
    ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 'project.read');

  insert into client_publications (id, organization_id, client_organization_id, project_id, source_table, source_id, title, summary, state, published_at, published_by) values
    ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'projects', '40000000-0000-0000-0000-000000000001', 'Update A', 'Published A', 'published_to_client', now(), '20000000-0000-0000-0000-000000000001');

  insert into documents (id, organization_id, client_id, project_id, title, storage_path, client_visible) values
    ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Client A Document', 'test/a.pdf', true);
`;

const rlsTests = `
  begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
    do $$
    declare c int;
    begin
      select count(*) into c from projects;
      if c <> 1 then raise exception 'internal project scope failed: %', c; end if;
      select count(*) into c from audit_events;
      if c <> 0 then raise exception 'non-executive audit scope failed: %', c; end if;
    end $$;
  rollback;

  begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
    do $$
    declare c int;
    begin
      select count(*) into c from projects;
      if c <> 1 then raise exception 'client project scope failed: %', c; end if;
      select count(*) into c from client_publications;
      if c <> 1 then raise exception 'client publication scope failed: %', c; end if;
      select count(*) into c from documents;
      if c <> 1 then raise exception 'client document scope failed: %', c; end if;
      select count(*) into c from audit_events;
      if c <> 0 then raise exception 'client audit scope failed: %', c; end if;
      begin
        insert into journal_entries (organization_id, memo) values ('10000000-0000-0000-0000-000000000001', 'client-write');
        raise exception 'client finance write unexpectedly succeeded';
      exception when insufficient_privilege then null;
      end;
    end $$;
  rollback;

  begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000005', true);
    do $$
    declare c int;
    begin
      select count(*) into c from projects;
      if c <> 0 then raise exception 'cross-tenant project leak: %', c; end if;
      select count(*) into c from client_publications;
      if c <> 0 then raise exception 'cross-tenant publication leak: %', c; end if;
    end $$;
  rollback;

  begin;
    set local role anon;
    select set_config('request.jwt.claim.sub', '', true);
    do $$
    declare c int;
    begin
      select count(*) into c from projects;
      if c <> 0 then raise exception 'anonymous project leak: %', c; end if;
      select count(*) into c from client_publications;
      if c <> 0 then raise exception 'anonymous publication leak: %', c; end if;
    end $$;
  rollback;
`;

const dbs = ['full_chain', 'drifted', 'rollback_test', 'rls_test'];
const dumpFile = path.join(process.cwd(), `.ksp-db-test-${process.pid}.dump`);
const files = fs.readdirSync('supabase/migrations').filter((file) => file.endsWith('.sql')).sort();
const reconciliation = files.find((file) => file.endsWith('_runtime_reconciliation.sql'));
if (!reconciliation) throw new Error('runtime reconciliation migration not found');
const reconciliationIndex = files.indexOf(reconciliation);
const beforeReconciliation = files.slice(0, reconciliationIndex);
const fromReconciliation = files.slice(reconciliationIndex);

try {
  run('docker', [
    'run', '--rm', '--name', container,
    '-e', `POSTGRES_PASSWORD=${postgresPassword}`,
    '-p', `${hostPort}:5432`,
    '-d', 'postgres:15-alpine'
  ]);
  await waitForPostgres();
  psql('postgres', clusterBootstrap);

  for (const db of dbs) createdb(db);

  // Fresh install: every migration must execute and converge.
  bootstrap('full_chain');
  applyMigrations('full_chain', files);
  verifyReconciliation('full_chain');

  // Drift simulation: apply history before the reconciliation migration, remove
  // the exact known objects, then apply reconciliation + all later migrations.
  bootstrap('drifted');
  applyMigrations('drifted', beforeReconciliation);
  psql('drifted', `
    drop table if exists client_meetings cascade;
    alter table tasks drop column if exists start_date cascade;
    alter table mission_milestones drop column if exists start_date cascade;
    drop policy if exists organization_memberships_executive_update on organization_memberships;
    drop policy if exists documents_portal_read on documents;
    drop policy if exists change_orders_portal_read on change_orders;
    drop function if exists preview_portal_invitation(text) cascade;
  `);
  applyMigrations('drifted', fromReconciliation);
  verifyReconciliation('drifted');

  // Rollback/forward-fix rehearsal: restore a backup taken immediately before the
  // forward reconciliation, then prove the migration can be re-applied.
  bootstrap('rollback_test');
  applyMigrations('rollback_test', beforeReconciliation);
  pgDump('rollback_test', dumpFile);
  applyMigrations('rollback_test', fromReconciliation);
  verifyReconciliation('rollback_test');
  dropdb('rollback_test');
  createdb('rollback_test');
  pgRestore('rollback_test', dumpFile);
  applyMigrations('rollback_test', fromReconciliation);
  verifyReconciliation('rollback_test');

  // Positive/negative actor RLS tests.
  bootstrap('rls_test');
  applyMigrations('rls_test', files);
  grantAppTableAccess('rls_test');
  psql('rls_test', actorTests);
  psql('rls_test', rlsTests);

  // Managed Files (private Storage) RLS tests.
  const managedFilesSql = fs.readFileSync('supabase/tests/managed_files_storage.sql', 'utf8');
  psql('rls_test', managedFilesSql);

  // Task -> deliverable -> client publication behavior tests.
  const taskDeliverySql = fs.readFileSync('supabase/tests/task_delivery_behavior.sql', 'utf8');
  psql('rls_test', taskDeliverySql);

  // Business-unit/division project-access regression tests.
  const businessUnitsSql = fs.readFileSync('supabase/tests/business_units_access.test.sql', 'utf8');
  psql('rls_test', businessUnitsSql);

  console.log(`Database chain, drift recovery, rollback rehearsal, actor RLS, managed-files RLS, task-delivery, and business-unit access tests passed across ${files.length} active migrations.`);
} finally {
  if (fs.existsSync(dumpFile)) fs.rmSync(dumpFile, { force: true });
  spawnSync('docker', ['rm', '-f', container], { encoding: 'utf8' });
}
