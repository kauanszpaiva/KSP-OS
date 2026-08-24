import fs from 'node:fs';

const manifestPath = 'docs/deployment/APPROVED_DATABASE_LINEAGE.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const repoNames = fs.readdirSync('supabase/migrations')
  .filter((file) => file.endsWith('.sql'))
  .map((file) => file.replace(/^\d+_?/, '').replace(/\.sql$/, ''));
const accepted = manifest.acceptedLiveOnlyMigrations ?? [];

if (manifest.schemaVersion !== 1) throw new Error('unsupported database-lineage manifest version');
if (!manifest.targetProjectRef) throw new Error('database-lineage manifest is missing targetProjectRef');
if (new Set(accepted).size !== accepted.length) throw new Error('duplicate accepted live-only migration');
const collisions = accepted.filter((name) => repoNames.includes(name));
if (collisions.length) throw new Error(`accepted live-only migrations now collide with repository migrations: ${collisions.join(', ')}`);
if (!manifest.blockedUntilClassified && accepted.length) {
  throw new Error('live-only lineage cannot be released while accepted drift remains unclassified');
}

const snapshotRaw = process.env.KSP_DATABASE_LINEAGE_SNAPSHOT;
if (snapshotRaw) {
  const snapshot = JSON.parse(snapshotRaw);
  if (snapshot.projectRef !== manifest.targetProjectRef) throw new Error('lineage snapshot targets the wrong Supabase project');
  const liveOnly = snapshot.liveOnlyMigrations ?? [];
  const unexpected = liveOnly.filter((name) => !accepted.includes(name));
  const missing = accepted.filter((name) => !liveOnly.includes(name));
  if (unexpected.length || missing.length) {
    throw new Error(`database lineage differs from the reviewed manifest; unexpected=[${unexpected.join(', ')}] missing=[${missing.join(', ')}]`);
  }
}

console.log(`Database-lineage preflight passed: ${accepted.length} acknowledged live-only migration(s); production DDL blocked pending classification.`);
