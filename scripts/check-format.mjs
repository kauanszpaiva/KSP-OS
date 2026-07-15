import fs from 'node:fs';
import path from 'node:path';
const allowed = /\.(ts|tsx|mjs|json|md|sql|css|yml|yaml)$/;
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (['.git', 'node_modules', '.next', 'coverage'].includes(entry.name)) return [];
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const failures = [];
for (const file of walk('.')) {
  if (!allowed.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('\t')) failures.push(`${file}: contains tab characters`);
  if (!text.endsWith('\n')) failures.push(`${file}: missing trailing newline`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Repository formatting guard passed.');
