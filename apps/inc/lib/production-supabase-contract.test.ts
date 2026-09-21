import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function repoFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("KSP INC production Supabase contract", () => {
  it("binds production and main-branch builds to canonical KSPCENTER", () => {
    const source = repoFile("apps/inc/next.config.ts");

    expect(source).toContain(
      "https://rmaxqwbjizivkhurvuvx.supabase.co",
    );
    expect(source).toContain('process.env.VERCEL_ENV === "production"');
    expect(source).toContain(
      'process.env.VERCEL_GIT_COMMIT_REF === "main"',
    );
  });

  it("pins public production aliases to KSPCENTER at request time", () => {
    const source = repoFile("apps/inc/lib/supabase-routing.ts");

    expect(source).toContain('"ksp-os-inc.vercel.app"');
    expect(source).toContain(
      '"https://rmaxqwbjizivkhurvuvx.supabase.co"',
    );
    expect(source).toContain("isCanonicalIncHostname");
  });

  it("renders the login dynamically and disables cross-deployment caching", () => {
    const config = repoFile("apps/inc/next.config.ts");
    const layout = repoFile("apps/inc/app/login/layout.tsx");

    expect(config).toContain("private, no-store, max-age=0, must-revalidate");
    expect(layout).toContain('dynamic = "force-dynamic"');
    expect(layout).toContain("revalidate = 0");
  });

  it("does not parse GitHub workflow expressions as runtime credentials", () => {
    const source = repoFile("apps/inc/next.config.ts");

    expect(source).not.toContain("readFileSync");
    expect(source).not.toContain("setup-login.yml");
  });
});
