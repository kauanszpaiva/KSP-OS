import fs from 'node:fs'; import path from 'node:path';
const patterns=[/service_role[a-z0-9_\-]*\s*=\s*['"][^'"]+/i,/sb_secret_[a-z0-9_\-]+/i,/SUPABASE_SERVICE_ROLE_KEY=.+/];
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>{const p=path.join(dir,d.name); if(['.git','node_modules','.next'].includes(d.name))return[]; return d.isDirectory()?walk(p):[p];});}
const bad=[]; for(const f of walk('.')){if(f.replace(/\\/g, '/')==='scripts/check-secrets.mjs')continue; if(!/\.(ts|tsx|js|mjs|json|md|sql|env|yml|yaml)$/.test(f))continue; const s=fs.readFileSync(f,'utf8'); if(patterns.some(p=>p.test(s)))bad.push(f)}
if(bad.length){console.error('Possible secrets:',bad);process.exit(1)} console.log('No repository secrets matched configured patterns.');
