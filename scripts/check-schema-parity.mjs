import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Deterministic source-schema parity gate.
//
// Generic PR CI does not have production database credentials, so this check
// must never pretend that a runtime query happened. Instead it pins the exact
// reviewed active-migration content fingerprint. Any migration addition,
// removal or edit changes the fingerprint and must update the reviewed manifest
// in the same PR. Runtime migration-history comparison is handled separately by
// check-database-lineage.mjs when a controlled snapshot is supplied.

const migrationsDir = 'supabase/migrations';
const deferredDir = 'supabase/deferred_migrations';
const manifestPath = 'docs/deployment/REPOSITORY_SCHEMA_FINGERPRINT.json';

function getFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((file) => file.endsWith('.sql')).sort();
}

if (!fs.existsSync(manifestPath)) {
  throw new Error(`schema fingerprint manifest missing: ${manifestPath}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.schemaVersion !== 1) throw new Error('unsupported repository schema fingerprint manifest version');
if (!/^[a-f0-9]{64}$/.test(manifest.activeSchemaSha256 ?? '')) {
  throw new Error('repository schema fingerprint manifest has an invalid SHA256');
}

const activeMigrations = getFiles(migrationsDir);
const deferredMigrations = getFiles(deferredDir);

let activeContent = '';
for (const file of activeMigrations) {
  activeContent += fs.readFileSync(path.join(migrationsDir, file), 'utf8');
}

const fingerprint = crypto.createHash('sha256').update(activeContent).digest('hex');

console.log('--- Repository Schema Fingerprint ---');
console.log(`Active Migrations: ${activeMigrations.length}`);
console.log(`Deferred Migrations: ${deferredMigrations.length}`);
console.log(`Active Schema Fingerprint (SHA256): ${fingerprint}`);

const mismatches = [];
if (manifest.activeMigrationCount !== activeMigrations.length) {
  mismatches.push(`active migration count expected ${manifest.activeMigrationCount}, got ${activeMigrations.length}`);
}
if (manifest.deferredMigrationCount !== deferredMigrations.length) {
  mismatches.push(`deferred migration count expected ${manifest.deferredMigrationCount}, got ${deferredMigrations.length}`);
}
if (manifest.activeSchemaSha256 !== fingerprint) {
  mismatches.push(`active schema fingerprint expected ${manifest.activeSchemaSha256}, got ${fingerprint}`);
}

if (mismatches.length) {
  console.error('Repository schema parity failed:');
  for (const mismatch of mismatches) console.error(`- ${mismatch}`);
  console.error('If the schema change is intentional, update the reviewed fingerprint manifest in the same PR.');
  process.exit(1);
}

if (process.env.SUPABASE_DB_URL) {
  console.log('SUPABASE_DB_URL is present, but this source-fingerprint gate does not claim live parity. Run test:lineage with a controlled live snapshot for runtime comparison.');
}

console.log('Repository schema parity passed.');
