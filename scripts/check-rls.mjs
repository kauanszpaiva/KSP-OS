import fs from 'node:fs';
const sql = fs.readdirSync('supabase/migrations').filter((file) => file.endsWith('.sql')).sort().map((file) => fs.readFileSync(`supabase/migrations/${file}`, 'utf8')).join('\n');
const tables = [...sql.matchAll(/create table (?:if not exists )?(?:\w+\.)?(\w+)/gi)].map((match) => match[1]);
const uniqueTables = [...new Set(tables)];
const missing = uniqueTables.filter((table) => {
  const rls = new RegExp(`alter table (?:\\w+\\.)?${table} enable row level security`, 'i').test(sql);
  const policy = new RegExp(`create policy [^;]+ on (?:\\w+\\.)?${table}\\b`, 'i').test(sql);
  return !rls || !policy;
});
if (missing.length) {
  console.error('Missing RLS/policy:', missing);
  process.exit(1);
}
console.log(`RLS policy coverage present for ${uniqueTables.length} tables.`);
