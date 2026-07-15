import fs from 'node:fs';
import path from 'node:path';
const source = /\.(ts|tsx|mjs)$/;
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (['.git', 'node_modules', '.next', 'coverage'].includes(entry.name)) return [];
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const failures = [];
for (const file of walk('.')) {
  if (!source.test(file) || file.startsWith('scripts/')) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (/console\.log\(/.test(text)) failures.push(`${file}: banned debug console.log`);
  if (/TO-DO|FIX-ME/.test(text)) failures.push(`${file}: unresolved task marker`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Source lint guard passed.');
