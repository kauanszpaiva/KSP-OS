import fs from 'node:fs';
const required = ['apps/command/app/(app)/executive/page.tsx', 'apps/portal/app/page.tsx'];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error('Missing e2e entry points:', missing);
  process.exit(1);
}
console.log('E2E entry points exist; browser automation requires dependency installation and CI browser setup.');
