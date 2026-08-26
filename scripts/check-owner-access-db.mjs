import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function run(command, args, { input, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    input,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    stdio: input === undefined ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe']
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed (${result.status})\n${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  }
  return result;
}

const docker = run('docker', ['version'], { allowFailure: true });
if (docker.status !== 0) {
  if (process.env.CI) throw new Error('Docker is required for owner access DB tests.');
  console.log('Docker unavailable; owner access DB rehearsal skipped outside CI.');
  process.exit(0);
}

const containerName = `ksp-os-owner-access-${process.pid}-${Date.now()}`;
const db = 'owner_access';
const migrations = fs.readdirSync('supabase/migrations').filter((file) => file.endsWith('.sql')).sort();
const accessGraphTest = fs.readFileSync('supabase/tests/access_graph_v3.test.sql', 'utf8');
const ownerBoundaryTest = fs.readFileSync('supabase/tests/owner_access_boundary.test.sql', 'utf8');
const suspendedNotificationTest = fs.readFileSync('supabase/tests/suspended_notification_boundary.test.sql', 'utf8');
const aiCompanyRuntimeTest = fs.readFileSync('supabase/tests/ai_company_runtime.test.sql', 'utf8');

function dockerExec(args, options = {}) {
  return run('docker', ['exec', ...args], options);
}

function psql(database, sql) {
  return dockerExec(['-i', containerName, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database], { input: sql });
}

try {
  run('docker', ['run', '--name', containerName, '-e', 'POSTGRES_PASSWORD=postgres', '-d', 'postgres:15']);

  let ready = false;
  for (let i = 0; i < 40; i += 1) {
    const probe = dockerExec([containerName, 'pg_isready', '-U', 'postgres', '-d', 'postgres'], { allowFailure: true });
    if (probe.status === 0) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('PostgreSQL owner-access test container did not become ready.');

  psql('postgres', `
    do $$ begin
      if not exists (select 1 from pg_roles where rolname='anon') then execute 'create role anon nologin'; end if;
      if not exists (select 1 from pg_roles where rolname='authenticated') then execute 'create role authenticated nologin'; end if;
    end $$;
  `);

  dockerExec([containerName, 'createdb', '-U', 'postgres', db]);

  psql(db, `
    create schema auth;
    create table auth.users (id uuid primary key, email text unique);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;

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

  for (const file of migrations) {
    psql(db, fs.readFileSync(`supabase/migrations/${file}`, 'utf8'));
  }

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

  psql(db, accessGraphTest);
  psql(db, ownerBoundaryTest);
  psql(db, suspendedNotificationTest);
  psql(db, aiCompanyRuntimeTest);
  console.log('Owner access DB rehearsal passed: exact task assignment/mention isolation, anti-fan-out, revoke behavior, owner-only temporary grants, suspended notification denial, and AI Company owner/client-plane isolation.');
} finally {
  run('docker', ['rm', '-f', containerName], { allowFailure: true });
}
