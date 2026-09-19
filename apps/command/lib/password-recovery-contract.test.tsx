import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function repoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Command password recovery contract', () => {
  it('uses Supabase native recovery SMTP with the official KSP password-update redirect', () => {
    const login = repoFile('apps/command/app/login/page.tsx');

    expect(login).toContain('supabase.auth.resetPasswordForEmail(normalizedEmail');
    expect(login).toContain("https://www.appkspdominion.com");
    expect(login).toContain('redirectTo: `${commandOrigin}/account/update-password`');
    expect(login).not.toContain("supabase.functions.invoke('ksp-auth-recovery-request'");
  });

  it('pins Command recovery links to the official www origin', () => {
    const recovery = repoFile('supabase/functions/ksp-auth-recovery-request/index.ts');

    expect(recovery).toContain('const COMMAND_ORIGIN = "https://www.appkspdominion.com";');
    expect(recovery).toContain('const LEGACY_COMMAND_ORIGIN = "https://appkspdominion.com";');
    expect(recovery).toContain('const linkOrigin = canonicalRecoveryOrigin(requestOrigin);');
    expect(recovery).toContain('options: { redirectTo: `${linkOrigin}/account/update-password` }');
    expect(recovery).toContain('recoveryUrl(linkOrigin, linkData.properties.hashed_token)');
  });

  it('keeps the Command production base on the official www origin', () => {
    const nextConfig = repoFile('apps/command/next.config.ts');
    const envExample = repoFile('.env.example');
    const deploymentRunbook = repoFile('docs/deployment/vercel.md');

    for (const source of [nextConfig, envExample, deploymentRunbook]) {
      expect(source).toContain('https://www.appkspdominion.com');
    }
  });
});
