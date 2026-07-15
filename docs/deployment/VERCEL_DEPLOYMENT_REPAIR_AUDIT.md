# Vercel Deployment Repair Audit

## Initial audit

- `package.json` was invalid JSON, duplicated the `name` key, duplicated scripts, omitted commas, duplicated dependency declarations, and retained obsolete web application commands.
- `tsconfig.json` was invalid JSON because path aliases and `include` entries were malformed and duplicated.
- `.github/workflows/ci.yml` duplicated install, RLS, migration, secret, and build steps, and duplicated the `with` key for dependency review.
- `pnpm-lock.yaml` was absent, while CI required `pnpm install --frozen-lockfile`.
- `tailwind.config.ts` scanned the obsolete web application path.
- The obsolete web application directory still existed after the split into `apps/command` and `apps/portal`.
- Application-level TypeScript, Tailwind, and PostCSS configuration files were missing.
- `scripts/check-rls.mjs` contained duplicated declarations that would prevent the RLS check from running.
- README content was duplicated and stale for the two-project Vercel deployment model.

## Changes made

- Replaced root `package.json` with one valid workspace manifest named `ksp-os`.
- Added `tsconfig.base.json`, repaired root `tsconfig.json`, and added explicit app/package `tsconfig.json` files.
- Configured Next.js transpilation for imported workspace packages.
- Added app-level Tailwind and PostCSS configuration that imports the shared root configuration intentionally.
- Removed the obsolete web application directory and stale active configuration references.
- Replaced CI workflow with a single frozen install and nonduplicated validation/build/security steps.
- Repaired `scripts/check-rls.mjs` so the RLS coverage check executes honestly.
- Rewrote README and added a Vercel monorepo setup guide.

## Package-manager status

Corepack and npm registry access failed in this execution environment with a proxy 403 while requesting `https://registry.npmjs.org/pnpm/-/pnpm-9.12.0.tgz` and `https://registry.npmjs.org/pnpm`. A lockfile still must be generated from a registry-enabled environment before merge if it cannot be generated here.

## Vercel readiness

Use two Vercel projects with Root Directories `apps/command` and `apps/portal`, detected pnpm workspace installation, app-local `pnpm build`, and source files outside the root directory enabled.
