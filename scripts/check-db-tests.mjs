import fs from 'node:fs';
const files = fs.readdirSync('supabase/tests').filter((file) => file.endsWith('.sql'));
if (!files.length) throw new Error('no supabase sql tests found');
const required = ['cross-organization denial', 'cross-client denial', 'cross-project denial', 'internal-note protection', 'finance protection', 'client publication protection', 'no self-approval', 'expired access denial', 'suspended access denial'];
const combined = files.map((file) => fs.readFileSync(`supabase/tests/${file}`, 'utf8')).join('\n');
const missing = required.filter((term) => !combined.includes(term));
if (missing.length) {
  console.error('Supabase test plan is missing coverage terms:', missing);
  process.exit(1);
}
console.log(`Found ${files.length} Supabase SQL test file(s) with required authorization coverage terms.`);
