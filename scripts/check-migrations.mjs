import fs from 'node:fs';
const files=fs.readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql'));
if(!files.length) throw new Error('no migrations found');
for(const f of files){const sql=fs.readFileSync(`supabase/migrations/${f}`,'utf8'); if(!/enable row level security/i.test(sql)) throw new Error(`${f} missing RLS`);}
console.log(`Validated ${files.length} migration file(s).`);
