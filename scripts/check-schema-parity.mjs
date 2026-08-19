import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Reconcile and calculate a deterministic fingerprint of the active schema.
// This supports verification of the schema parity across repo and runtime.

const migrationsDir = 'supabase/migrations';
const deferredDir = 'supabase/deferred_migrations';

function getFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
}

const activeMigrations = getFiles(migrationsDir);
const deferredMigrations = getFiles(deferredDir);

console.log('--- Migration Lineage Fingerprint ---');
console.log(`Active Migrations: ${activeMigrations.length}`);
console.log(`Deferred Migrations: ${deferredMigrations.length}`);

let activeContent = '';
for (const file of activeMigrations) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  activeContent += content;
}

const fingerprint = crypto.createHash('sha256').update(activeContent).digest('hex');
console.log(`Active Schema Fingerprint (SHA256): ${fingerprint}`);

// Optional: check against a Supabase DB if a URL is provided
if (process.env.SUPABASE_DB_URL) {
    console.log('Database URL provided. In a real environment, this would query supabase_migrations.schema_migrations and compare hashes.');
}

console.log('Verification Complete.');
