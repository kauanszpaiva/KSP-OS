# Vercel pnpm workspace installation

This monorepo serves both Vercel projects from the same Git repository, `kauanszpaiva/KSP-OS`. Keep a single root `pnpm-lock.yaml`; do not create application-level lockfiles under `apps/command` or `apps/portal`.

## Runtime and package manager

- Node.js: `22.x`
- pnpm: `10.28.1` via Corepack
- Registry: `https://registry.npmjs.org/`

Prefer leaving the Vercel Install Command unset so Vercel detects the committed root lockfile and the root `packageManager` field. If Vercel requires an explicit install command, use:

```bash
corepack enable && corepack prepare pnpm@10.28.1 --activate && pnpm install --frozen-lockfile
```

Do not use `npm install`, `yarn install`, an unpinned pnpm version, or `--no-frozen-lockfile`.

## Command OS project

- Repository: `kauanszpaiva/KSP-OS`
- Root Directory: `apps/command`
- Node.js Version: `22.x`
- Framework: Next.js
- Output Directory: default
- Include source files outside Root Directory: enabled
- Build Command: `pnpm build`

## Client Portal project

- Repository: `kauanszpaiva/KSP-OS`
- Root Directory: `apps/portal`
- Node.js Version: `22.x`
- Framework: Next.js
- Output Directory: default
- Include source files outside Root Directory: enabled
- Build Command: `pnpm build`

## Registry and secret hygiene

Use the public npm registry without committed tokens:

```ini
registry=https://registry.npmjs.org/
```

Before changing Vercel install settings, confirm project and team environment variables do not override `npm_config_registry`, `NPM_CONFIG_REGISTRY`, `HTTP_PROXY`, `HTTPS_PROXY`, or `NODE_TLS_REJECT_UNAUTHORIZED`. Do not disable TLS verification.

## Rollback

To roll back this install change, revert the commit that updated the root package manager/runtime pin, CI Corepack setup, `.npmrc`, and generated lockfile. After reverting, re-run `corepack enable`, activate the package manager pinned in `package.json`, and verify both Vercel projects can still install with `pnpm install --frozen-lockfile` before redeploying.
