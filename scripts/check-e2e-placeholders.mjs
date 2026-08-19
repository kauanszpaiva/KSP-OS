import fs from 'node:fs';

const required = [
  'apps/command/app/(app)/executive/page.tsx',
  'apps/portal/app/page.tsx',
  'e2e/managed-files.spec.ts'
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error('Missing e2e entry points:', missing);
  process.exit(1);
}

const managedFilesSpec = fs.readFileSync('e2e/managed-files.spec.ts', 'utf8');
const requiredContracts = [
  '/storage/v1/object/managed-files/',
  '/storage/v1/object/authenticated/managed-files/',
  'x-upsert',
  'E2E_SUPABASE_SERVICE_ROLE_KEY'
];
const missingContracts = requiredContracts.filter((term) => !managedFilesSpec.includes(term));
if (missingContracts.length) {
  console.error('Managed-files e2e contract is incomplete:', missingContracts);
  process.exit(1);
}

console.log('E2E entry points and managed-files upload/view contract exist; browser/API execution requires seeded non-production Supabase credentials.');
