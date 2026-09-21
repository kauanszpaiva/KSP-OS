import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function repoFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('KSP Network owner View As contract', () => {
  it('uses the semantic KSP INC owner boundary and real partner memberships', () => {
    const source = repoFile('apps/network/lib/view-as.ts');

    expect(source).toContain('isKspIncOwner');
    expect(source).toContain(".from('partner_memberships')");
    expect(source).toContain(".eq('organization_id', owner.organizationId)");
    expect(source).toContain(".eq('status', 'active')");
  });

  it('keeps preview short-lived and bound to an httpOnly cookie', () => {
    const source = repoFile('apps/network/app/view-as/actions.ts');

    expect(source).toContain('NETWORK_VIEW_AS_TTL_SECONDS');
    expect(source).toContain('httpOnly: true');
    expect(source).toContain("sameSite: 'lax'");
    expect(source).toContain("'network.view_as_started'");
    expect(source).toContain("'network.view_as_stopped'");
  });

  it('blocks partner mutations while an owner preview is active', () => {
    const actions = repoFile('apps/network/app/actions.ts');
    const page = repoFile('apps/network/app/page.tsx');

    expect(actions).toContain('isNetworkViewAsActive');
    expect(actions).toContain('VIEW_AS_READ_ONLY_ERROR');
    expect(page).toContain('!session.viewAs');
    expect(page).toContain('respondToAssignment');
  });
});
