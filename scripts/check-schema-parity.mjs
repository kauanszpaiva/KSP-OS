import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const migrationsDir = 'supabase/migrations';
const deferredDir = 'supabase/deferred_migrations';
const remapEvidencePath = 'docs/deployment/LIVE_MIGRATION_REMAPS_2026-08-24.json';
const liveOnlyEvidencePath = 'docs/deployment/LIVE_ONLY_LINEAGE_CLASSIFICATION_2026-08-24.json';

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
if (!fs.existsSync(liveOnlyEvidencePath)) {
  throw new Error(`required live-only lineage evidence is missing: ${liveOnlyEvidencePath}`);
}

const evidence = JSON.parse(fs.readFileSync(remapEvidencePath, 'utf8'));
const liveOnlyEvidence = JSON.parse(fs.readFileSync(liveOnlyEvidencePath, 'utf8'));
if (evidence.schemaVersion !== 1) throw new Error('unsupported live remap evidence schema version');
if (!evidence.targetProjectRef) throw new Error('live remap evidence is missing targetProjectRef');
if (!Array.isArray(evidence.remaps) || evidence.remaps.length === 0) {
  throw new Error('live remap evidence contains no remaps');
}
if (liveOnlyEvidence.targetProjectRef !== evidence.targetProjectRef) {
  throw new Error('live-only lineage evidence targets a different Supabase project');
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

const mediaEvidence = liveOnlyEvidence.clientMediaWorkspace;
if (!mediaEvidence?.repoFile || !mediaEvidence?.canonicalLiveRawMd5) {
  sourceFailures.push('client_media_workspace: canonical repo/live evidence is incomplete');
} else {
  const mediaRepoPath = path.join(migrationsDir, mediaEvidence.repoFile);
  if (!fs.existsSync(mediaRepoPath)) {
    sourceFailures.push(`client_media_workspace: missing repo file ${mediaEvidence.repoFile}`);
  } else {
    const mediaRepoSql = fs.readFileSync(mediaRepoPath, 'utf8');
    const mediaRepoRawMd5 = md5(mediaRepoSql);
    if (mediaRepoRawMd5 !== mediaEvidence.canonicalLiveRawMd5) {
      sourceFailures.push(
        `client_media_workspace: canonical live row is not byte-identical to repo source repo=${mediaRepoRawMd5} live=${mediaEvidence.canonicalLiveRawMd5}`
      );
    } else {
      console.log(
        `Client media canonical migration verified: repo ${mediaEvidence.repoFile} == live ${mediaEvidence.canonicalLiveVersion} (${mediaRepoRawMd5})`
      );
    }
  }
  if (mediaEvidence.classification !== 'duplicate_live_version_equivalent_to_repo_canonical') {
    sourceFailures.push('client_media_workspace: duplicate live lineage classification is missing');
  }
  if (!mediaEvidence.duplicateLiveVersion || !mediaEvidence.duplicateLiveRawMd5 || !mediaEvidence.livePunctuationNormalizedMd5) {
    sourceFailures.push('client_media_workspace: duplicate live version/hash evidence is incomplete');
  }
}

if (sourceFailures.length) {
  throw new Error(`live migration parity evidence mismatch:\n- ${sourceFailures.join('\n- ')}`);
}

const requireLive = process.env.KSP_REQUIRE_LIVE_PARITY === '1';
const databaseUrl = process.env.SUPABASE_DB_URL;

if (!databaseUrl) {
  if (requireLive) {
    throw new Error('KSP_REQUIRE_LIVE_PARITY=1 but SUPABASE_DB_URL is not configured');
  }
  console.log('Live DB parity query not requested; immutable live lineage evidence verified against repository SQL.');
  console.log('Verification Complete.');
  process.exit(0);
}

const names = evidence.remaps.map((remap) => remap.name);
const quotedNames = names.map((name) => `'${name.replaceAll("'", "''")}'`).join(',');
const remapSql = `
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

const remapResult = spawnSync('psql', [databaseUrl, '-At', '-F', '\t', '-c', remapSql], {
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024
});

if (remapResult.status !== 0) {
  throw new Error(`live parity query failed (${remapResult.status}): ${remapResult.stderr || remapResult.stdout}`);
}

const liveRows = remapResult.stdout
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

const mediaSql = `
with m as (
  select version, array_to_string(statements, E'\\n') as raw_sql
  from supabase_migrations.schema_migrations
  where name='client_media_workspace'
), normalized as (
  select version,
    md5(raw_sql) as raw_md5,
    md5(
      regexp_replace(
        trim(
          regexp_replace(
            regexp_replace(
              regexp_replace(lower(raw_sql), E'(?s)/\\\\*.*?\\\\*/', ' ', 'g'),
              E'--[^\\n]*', ' ', 'g'
            ),
            '[[:space:]]+', ' ', 'g'
          )
        ),
        '[[:space:]]*([(),=;])[[:space:]]*', '\\\\1', 'g'
      )
    ) as punctuation_normalized_md5
  from m
)
select version, raw_md5, punctuation_normalized_md5
from normalized
order by version;
`;
const mediaResult = spawnSync('psql', [databaseUrl, '-At', '-F', '\t', '-c', mediaSql], {
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024
});
if (mediaResult.status !== 0) {
  throw new Error(`client-media live parity query failed (${mediaResult.status}): ${mediaResult.stderr || mediaResult.stdout}`);
}
const mediaRows = mediaResult.stdout
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const [version, rawMd5, punctuationNormalizedMd5] = line.split('\t');
    return { version, rawMd5, punctuationNormalizedMd5 };
  });
for (const [label, version, rawMd5] of [
  ['canonical', mediaEvidence.canonicalLiveVersion, mediaEvidence.canonicalLiveRawMd5],
  ['duplicate', mediaEvidence.duplicateLiveVersion, mediaEvidence.duplicateLiveRawMd5]
]) {
  const row = mediaRows.find((candidate) => candidate.version === version);
  if (!row) {
    runtimeFailures.push(`client_media_workspace: ${label} live version ${version} not found`);
    continue;
  }
  if (row.rawMd5 !== rawMd5) {
    runtimeFailures.push(`client_media_workspace: ${label} live raw hash changed evidence=${rawMd5} runtime=${row.rawMd5}`);
  }
  if (row.punctuationNormalizedMd5 !== mediaEvidence.livePunctuationNormalizedMd5) {
    runtimeFailures.push(
      `client_media_workspace: ${label} normalized hash changed evidence=${mediaEvidence.livePunctuationNormalizedMd5} runtime=${row.punctuationNormalizedMd5}`
    );
  }
}

if (runtimeFailures.length) {
  throw new Error(`live runtime parity mismatch:\n- ${runtimeFailures.join('\n- ')}`);
}

console.log(`Live runtime parity verified for ${evidence.remaps.length} classified remap(s) plus client_media_workspace duplicate lineage.`);
console.log('Verification Complete.');
