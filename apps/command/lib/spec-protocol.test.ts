import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function repoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('repository Spec protocol', () => {
  it('keeps the protocol wired into agent and PR entry points', () => {
    expect(repoFile('docs/spec/README.md')).toContain('`Spec` is the mandatory KSP-OS plan-to-code compliance gate');
    expect(repoFile('AGENTS.md')).toContain('## Spec compliance gate');
    expect(repoFile('reference/CLAUDE.md')).toContain('## Spec compliance gate');
    expect(repoFile('.github/pull_request_template.md')).toContain('## Spec compliance');
  });

  it('keeps conflict handling and release severity explicit', () => {
    const protocol = repoFile('docs/spec/README.md');
    expect(protocol).toContain('When two sources conflict');
    expect(protocol).toContain('Critical/High divergences must be fixed');
    expect(protocol).toContain('Current KSP INC visual precedence');
  });
});
