import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/202607150001_foundation.sql','utf8');
const tables=[...sql.matchAll(/create table (\w+)/g)].map(m=>m[1]);
const missing=tables.filter(t=>!sql.includes(`alter table ${t} enable row level security`)||!sql.includes(` on ${t} `));
if(missing.length){console.error('Missing RLS/policy:',missing);process.exit(1)}
console.log(`RLS policy coverage present for ${tables.length} tables.`);
