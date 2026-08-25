import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '../..');

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('KSP INC owner access mutation contract', () => {
  it('requires the semantic owner boundary and MFA for native access writes', () => {
    const source = read('apps/inc/app/access/actions.ts');
    expect(source).toContain('isKspIncOwner(ctx)');
    expect(source).toContain('if (!ctx.mfa)');
    expect(source).toContain('Step-up MFA is required for access changes.');
    expect(source).toContain('setBusinessUnitMembership');
    expect(source).toContain('setInternalMembershipSuspended');
    expect(source).toContain('grantInternalPermission');
    expect(source).toContain('grantTemporaryAccess');
    expect(source).toContain('setPartnerMembership');
    expect(source).toContain('setProjectBusinessUnit');
  });

  it('protects global owners from accidental suspension in the ordinary people control', () => {
    const source = read('apps/inc/app/access/actions.ts');
    expect(source).toContain("const OWNER_ROLES = new Set(['founder_ceo', 'executive_operations'])");
    expect(source).toContain('You cannot suspend your own owner session.');
    expect(source).toContain('Owner-role suspension requires a separate recovery-governed process.');
  });

  it('preserves revocation history instead of deleting temporary entitlements', () => {
    const source = read('apps/inc/app/access/actions.ts');
    const migration = read('supabase/migrations/20260825062000_owner_access_mutation_boundary.sql');
    expect(source).toContain(".update({ revoked_at: new Date().toISOString() })");
    expect(migration).toContain('No DELETE policy by design');
    expect(migration).toContain('create policy temporary_access_update');
  });

  it('removes the legacy broad temporary-access mutation policy', () => {
    const migration = read('supabase/migrations/20260825062000_owner_access_mutation_boundary.sql');
    expect(migration).toContain('drop policy if exists temporary_access_internal');
    expect(migration).toContain('public.is_executive(organization_id)');
    expect(migration).toContain('profile_id = (select auth.uid())');
    expect(migration).not.toContain('for all to authenticated');
  });

  it('keeps the native INC surfaces as the owner workflow', () => {
    const overview = read('apps/inc/app/page.tsx');
    const shell = read('apps/inc/components/inc-shell.tsx');
    expect(overview).toContain("['Structure', '/structure'");
    expect(overview).toContain("['Access', '/access'");
    expect(shell).toContain("['People', '/people']");
    expect(shell).toContain("['Network', '/network']");
  });
});
