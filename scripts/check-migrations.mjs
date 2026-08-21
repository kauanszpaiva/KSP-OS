import fs from 'node:fs';

const files = fs.readdirSync('supabase/migrations').filter((file) => file.endsWith('.sql'));
if (!files.length) throw new Error('no migrations found');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const file of files) {
  const sql = fs.readFileSync(`supabase/migrations/${file}`, 'utf8');
  const createdTables = [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi)].map(
    (match) => match[1]
  );

  for (const table of new Set(createdTables)) {
    const tablePattern = escapeRegex(table);
    const enablesRls = new RegExp(
      `alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:public\\.)?"?${tablePattern}"?\\s+enable\\s+row\\s+level\\s+security`,
      'i'
    ).test(sql);
    if (!enablesRls) throw new Error(`${file} creates ${table} without enabling RLS in the same migration`);
  }
}

console.log(`Validated ${files.length} migration file(s); every created table enables RLS in its migration.`);
