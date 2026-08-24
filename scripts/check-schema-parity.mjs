import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const migrationsDir = 'supabase/migrations';
const deferredDir = 'supabase/deferred_migrations';
const remapEvidencePath = 'docs/deployment/LIVE_MIGRATION_REMAPS_2026-08-24.json';

function getFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((file) => file.endsWith('.sql')).sort();
}

function normalizeSql(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\r\n]*/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function md5(value) {
  return crypto.createHash('md5').update(value).digest('hex');
}

function parseMigrationFile(file) {
  const match = /^(\d+)_([^/]+)\.sql$/.exec(file);
  if (!match) throw new Error(`invalid migration filename: ${file}`);
  return { version: match[1], name: match[2] };
}

const activeMigrations = getFiles(migrationsDir);
const deferredMigrations = getFiles(deferredDir);

console.log('--- Migration Lineage Fingerprint ---');
console.log(`Active Migrations: ${activeMigrations.length}`);
console.log(`Deferred Migrations: ${deferredMigrations.length}`);

const activeContent = activeMigrations
  .map((file) => fs.readFileSync(path.join(migrationsDir, file), 'utf8'))
  .join('');
const fingerprint = crypto.createHash('sha256').update(activeContent).digest('hex');
console.log(`Active Schema Fingerprint (SHA256): ${fingerprint}`);

if (!fs.existsSync(remapEvidencePath)) {
  throw new Error(`required live remap evidence is missing: ${remapEvidencePath}`);
}

const evidence = JSON.parse(fs.readFileSync(remapEvidencePath, 'utf8'));
if (evidence.schemaVersion !== 1) throw new Error('unsupported live remap evidence schema version');
if (!evidence.targetProjectRef) throw new Error('live remap evidence is missing targetProjectRef');
if (!Array.isArray(evidence.remaps) || evidence.remaps.length === 0) {
  throw new Error('live remap evidence contains no remaps');
}

const sourceFailures = [];
for (const remap of evidence.remaps) {
  const repoPath = path.join(migrationsDir, remap.repoFile);
  if (!fs.existsSync(repoPath)) {
    sourceFailures.push(`${remap.name}: missing repo file ${remap.repoFile}`);
    continue;
  }

  const parsed = parseMigrationFile(remap.repoFile);
  if (parsed.version !== remap.repoVersion || parsed.name !== remap.name) {
    sourceFailures.push(`${remap.name}: repo filename metadata does not match evidence`);
    continue;
  }
  if (remap.classification !== 'normalized_sql_equivalent') {
    sourceFailures.push(`${remap.name}: remap is not classified normalized_sql_equivalent`);
    continue;
  }

  const repoSql = fs.readFileSync(repoPath, 'utf8');
  const repoNormalizedMd5 = md5(normalizeSql(repoSql));
  if (repoNormalizedMd5 !== remap.liveNormalizedMd5) {
    sourceFailures.push(
      `${remap.name}: normalized SQL mismatch repo=${repoNormalizedMd5} live=${remap.liveNormalizedMd5}`
    );
  } else {
    console.log(
      `Remap verified: ${remap.repoVersion} -> ${remap.liveVersion} ${remap.name} (${repoNormalizedMd5})`
    );
  }
}

if (sourceFailures.length) {
  throw new Error(`live migration remap evidence mismatch:\n- ${sourceFailures.join('\n- ')}`);
}

const requireLive = process.env.KSP_REQUIRE_LIVE_PARITY === '1';
const databaseUrl = process.env.SUPABASE_DB_URL;

if (!databaseUrl) {
  if (requireLive) {
    throw new Error('KSP_REQUIRE_LIVE_PARITY=1 but SUPABASE_DB_URL is not configured');
  }
  console.log('Live DB parity query not requested; immutable live remap evidence verified against repository SQL.');
  console.log('Verification Complete.');
  process.exit(0);
}

const names = evidence.remaps.map((remap) => remap.name);
const quotedNames = names.map((name) => `'${name.replaceAll("'", "''")}'`).join(',');
const sql = `
select version, name,
  md5(trim(
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(array_to_string(statements, E'\\n')), E'(?s)/\\\\*.*?\\\\*/', ' ', 'g'),
        E'--[^\\n]*', ' ', 'g'
      ),
      '[[:space:]]+', ' ', 'g'
    )
  )) as normalized_md5
from supabase_migrations.schema_migrations
where name in (${quotedNames})
order by version;
`;

const result = spawnSync('psql', [databaseUrl, '-At', '-F', '\t', '-c', sql], {
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024
});

if (result.status !== 0) {
  throw new Error(`live parity query failed (${result.status}): ${result.stderr || result.stdout}`);
}

const liveRows = result.stdout
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const [version, name, normalizedMd5] = line.split('\t');
    return { version, name, normalizedMd5 };
  });

const runtimeFailures = [];
for (const remap of evidence.remaps) {
  const row = liveRows.find((candidate) => candidate.name === remap.name && candidate.version === remap.liveVersion);
  if (!row) {
    runtimeFailures.push(`${remap.name}: expected live version ${remap.liveVersion} not found`);
    continue;
  }
  if (row.normalizedMd5 !== remap.liveNormalizedMd5) {
    runtimeFailures.push(
      `${remap.name}: runtime hash changed evidence=${remap.liveNormalizedMd5} runtime=${row.normalizedMd5}`
    );
  }
}

if (runtimeFailures.length) {
  throw new Error(`live runtime parity mismatch:\n- ${runtimeFailures.join('\n- ')}`);
}

console.log(`Live runtime parity verified for ${evidence.remaps.length} classified remap(s).`);
console.log('Verification Complete.');
