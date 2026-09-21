import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function repoFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('KSP INC production Supabase contract', () => {
  it('binds production and main-branch builds to canonical KSPCENTER', () => {
    const source = repoFile('apps/inc/next.config.ts');

    expect(source).toContain(
      'https://rmaxqwbjizivkhurvuvx.supabase.co'
    );
    expect(source).toContain('process.env.VERCEL_ENV === "production"');
    expect(source).toContain(
      'process.env.VERCEL_GIT_COMMIT_REF === "main"'
    );
  });

  it('does not parse GitHub workflow expressions as runtime credentials', () => {
    const source = repoFile('apps/inc/next.config.ts');

    expect(source).not.toContain('readFileSync');
    expect(source).not.toContain('setup-login.yml');
  });
});
