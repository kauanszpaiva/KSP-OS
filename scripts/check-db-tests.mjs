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
  'suspended access denial',
  'finance negative permissions'
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
const image = 'postgres:15';
const migrations = fs.readdirSync('supabase/migrations').filter((file) => file.endsWith('.sql')).sort();
const reconciliationName = '202608130001_runtime_reconciliation.sql';
const reconciliation = fs.readFileSync(`supabase/migrations/${reconciliationName}`, 'utf8');
const managedFilesTest = fs.readFileSync('supabase/tests/managed_files.test.sql', 'utf8');
const taskDeliveryEvidenceTest = fs.readFileSync('supabase/tests/task_delivery_evidence.test.sql', 'utf8');
const businessUnitsAccessTest = fs.readFileSync('supabase/tests/business_units_access.test.sql', 'utf8');
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

    -- Minimal Supabase Storage catalog used only by the Docker rehearsal.
    -- Production already provides these tables via the Supabase Storage service.
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

    -- Minimal Supabase platform-service shims for schema/behavior rehearsal.
    -- These never leave Docker and contain no provider credential. They let the
    -- canonical migration chain compile while external delivery is deterministic.
    create schema extensions;
    create extension if not exists pgcrypto with schema extensions;
    create type extensions.http_header as (field text, value text);
    create type extensions.http_request as (
      method text,
      uri text,
      headers extensions.http_header[],
      content_type text,
      content text
    );
    create type extensions.http_response as (
      status integer,
      content_type text,
      headers extensions.http_header[],
      content text
    );
    create or replace function extensions.http_header(field text, value text)
    returns extensions.http_header language sql immutable as $$
      select row(field, value)::extensions.http_header
    $$;
    create or replace function extensions.http(request extensions.http_request)
    returns extensions.http_response language sql volatile as $$
      select row(200, 'application/json', array[]::extensions.http_header[], '{"id":"docker-test-message"}')::extensions.http_response
    $$;

    create schema vault;
    create table vault.decrypted_secrets (
      name text primary key,
      decrypted_secret text
    );
    insert into vault.decrypted_secrets(name, decrypted_secret) values
      ('ksp_resend_api_key', 'docker-test-resend-key'),
      ('ksp_portal_base_url', 'https://portal.test.invalid');
  `);
}
function applyMigration(db, file) {
  try {
    psql(db, fs.readFileSync(`supabase/migrations/${file}`, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Migration ${file} failed on ${db}:\n${message}`);
  }
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
      if has_function_privilege('anon', 'preview_portal_invitation(text)', 'execute') then raise exception 'anonymous invitation preview execution remained exposed'; end if;
    end $$;
  rollback;
`;

const backupRestoreTests = `
  create table if not exists backup_restore_probe (id uuid primary key, note text not null);
  insert into backup_restore_probe(id, note) values ('90000000-0000-0000-0000-000000000001', 'before-backup');
`;

const recoveryTests = `
  do $$ begin
    begin
      insert into tasks (organization_id, project_id, title, item_type)
      values ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'bogus', 'x');
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
  const postReconciliation = migrations.filter((file) => file > reconciliationName);
  applyMigrations('drift', postReconciliation);
  verifyReconciliation('drift');

  grantAppTableAccess('full_chain');
  psql('full_chain', actorTests);
  psql('full_chain', managedFilesTest);
  psql('full_chain', taskDeliveryEvidenceTest);
  psql('full_chain', businessUnitsAccessTest);
  psql('full_chain', backupRestoreTests);
  psql('full_chain', recoveryTests);

  const dump = run('docker', ['exec', containerName, 'pg_dump', '-U', 'postgres', '-d', 'full_chain', '--format=custom']);
  createDb('restored');
  const restore = run('docker', ['exec', '-i', containerName, 'pg_restore', '-U', 'postgres', '-d', 'restored'], { input: dump.stdout, encoding: null });
  if (restore.status !== 0) throw new Error(`pg_restore failed (${restore.status})`);
  const restoredProbe = psql('restored', `select case when exists(select 1 from backup_restore_probe where note='before-backup') then 'restore-ok' else 'restore-failed' end;`);
  if (!restoredProbe.stdout.includes('restore-ok')) throw new Error('Backup/restore rehearsal failed.');

  console.log(`Behavioral DB rehearsal passed: ${migrations.length} active migration(s), drift reconciliation, RLS/tenant negative paths, and backup/restore.`);
} finally {
  run('docker', ['rm', '-f', containerName], { allowFailure: true });
}
