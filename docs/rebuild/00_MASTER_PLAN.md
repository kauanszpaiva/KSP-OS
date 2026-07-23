# KSP-OS Rebuild — Master Plan

**This is the live source of truth for the Asana-style rebuild of KSP-OS.**
Read this file, the relevant section file, and `reference/CLAUDE.md` before
touching any of this work. Every AI or human that picks up a task here must
follow the protocol below — no exceptions.

---

## 0. Why this exists

Kauan (founder, KSP Dominion Group) asked for two things at once:

1. Rebuild the entire visual/UX of KSP-OS to feel like **Asana** — the software
   he loves — using **KSP's brand colors** (purple + green), with both
   **dark and light mode**, fully **responsive** (desktop/tablet/mobile), and
   **fluid, animated, fast, simple, easy, effective, efficient** throughout.
2. Bring **every module** proposed in the codebase **to life** — not just the
   5 that currently work, but all 18 (plus the client Portal), fully
   functional, not just placeholders.

This is a large effort. It is broken into two groups — **Command** (internal
app) and **Portal** (client-facing app) — each split into phases, each phase
into modules, each module into tasks. Every module ships as a complete
vertical slice (see Definition of Done below), never a visual mockup pretending
to work.

---

## 1. Status legend

| Symbol | Meaning |
|---|---|
| ⬜ | Not started |
| 🟦 | In progress |
| 🧪 | Built — in review/testing |
| ✅ | Done & verified (built, tested, checks passing) |
| ⛔ | Blocked (say why, and by what) |

**Never mark something ✅ that hasn't actually been run and verified.** If you
only had time to build the UI but not test it, mark it 🧪 and say exactly what
was and wasn't checked. Honesty here is load-bearing — the next agent trusts
this file instead of re-reading all the code.

---

## 2. Protocol for any AI/dev picking up work here

1. Read `reference/CLAUDE.md` (repo-wide agent rules), this file, and the
   specific section file under `docs/rebuild/command/` or `docs/rebuild/portal/`
   for the module you're about to touch.
2. Check `docs/rebuild/STATUS.md` for the current aggregate state and pick the
   next **not-blocked** task. Mark it 🟦 in both the section file and
   `STATUS.md`, and note the branch/date you're working on it.
3. Implement the module as a **complete vertical slice** (see Definition of
   Done below). Reuse existing DB tables / RLS / Zod schemas / auth guards —
   most planned modules already have backing schema; check
   `supabase/migrations/*` and `packages/validation/src/*` first.
4. Run the required checks (below). Record the *actual* commands you ran and
   their *actual* result — pass or fail — in the task's row/notes. Never
   silently skip a check; if you couldn't run one (e.g. it needs live
   Supabase), say so explicitly.
5. Only mark ✅ once the slice is built **and** verified. Update both the
   section file and `STATUS.md`. Reference the PR.
6. If you get blocked, mark ⛔ with the specific blocker (missing decision,
   missing credential, conflicting requirement) so the next agent doesn't
   repeat the same dead end.

### Required checks before marking a task ✅

```
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:db
pnpm test:rls
pnpm test:migrations
pnpm security:secrets
pnpm build:command   # and/or build:portal, depending on the app touched
```

For modules with a new migration, also add/run SQL tests in
`supabase/tests/` (allow + deny cases, including cross-client/cross-org).
For modules with a client-visible journey, extend
`e2e/critical-journey.spec.ts` where practical (it needs seeded Supabase and
is not part of CI by default — note that limitation rather than skip silently).

---

## 3. Design direction (Asana + KSP identity)

### Layout (applies to both Command and Portal)

- **Left sidebar**, collapsible, grouped by section (Command / Execution /
  Growth / Control / Private for Command; a simpler flat nav for Portal),
  icon + label per module, module search, workspace mark at top.
- **Top bar**: quick-create ("+"), notifications, theme toggle, avatar menu.
- **Main area**: per-module view tabs where relevant (List / Board / Calendar
  / Timeline).
- **Right context panel** (slide-over) for record detail without losing the
  list.
- Asana-style aesthetic: rounded corners, soft borders, generous spacing,
  colored accent bars, status pills, circular avatars, comfortable density.

### Color system (CSS variables, themeable via `data-theme`)

Defined in `apps/command/app/globals.css` (and to be mirrored in
`apps/portal/app/globals.css` in Phase P0), consumed by
`tailwind.config.ts` at the repo root:

- Brand: `--brand` (KSP purple), `--brand-strong`, `--brand-tint`, `--on-brand`
  (readable text on brand backgrounds, flips per theme).
- Accent: `--accent` (KSP green), `--accent-strong`, `--accent-tint`,
  `--on-accent` — used for success / completed-progress / highlights, not as
  a second primary color.
- Surfaces: `--canvas`, `--surface`, `--surface-2`, `--overlay`.
- Text: `--ink`, `--ink-2`, `--ink-3`, `--ink-4`.
- Lines: `--line`, `--line-2`.
- Semantic: `--good`, `--warn`, `--risk` (+ `-tint` each).

Two full sets: `:root` (light — the Asana-like reference) and
`:root[data-theme="dark"]` (dark — grafite/black base echoing the KSP logo).
**Purple is primary** (navigation, actions, brand); **green is the
highlight/success hue**. Contrast target: WCAG 2.2 AA in both themes.

### Theme mechanism

- `packages/ui/src/theme-script.ts` — `themeInitScript`, a plain string
  inlined into `<head>` so the correct theme applies before paint (no flash).
- `packages/ui/src/theme.tsx` — `ThemeProvider` + `useTheme()` +
  `ThemeToggle`. Preference (`system` | `light` | `dark`) persists to
  `localStorage` under `ksp-theme`; defaults to system preference.

### Motion & fluidity

- CSS-driven (transform/opacity only — no new animation runtime dependency).
  Tokens in `tailwind.config.ts` (`duration-fast/DEFAULT/slow`,
  `ease-standard`) and keyframes (`fade-in`, `fade-slide-up`, `scale-in`,
  `slide-in-right`, `shimmer`).
- `packages/ui/src/motion-react.tsx` — `Reveal` (entrance fade+slide, optional
  delay) and `Stagger` (sequenced list entrance).
- Every interactive primitive (`Button`, `Card`, nav links, menus) has a
  micro-interaction: hover, active/press (`scale-[0.98]`), focus-visible ring.
- `prefers-reduced-motion: reduce` is honored globally
  (`apps/command/app/globals.css`) — collapses all animation/transition
  durations to ~0. Keyboard focus and navigation never depend on motion.

### UX principles (simple, fast, easy, effective, efficient)

- **Simple**: one clear objective per screen; comfortable Asana-like density.
- **Fast**: Server Components, skeletons instead of spinners, optimistic
  mutations where safe, no unnecessary client-side fetching waterfalls.
- **Easy**: quick-create and consistent patterns everywhere; inline
  validation with actionable messages; sensible defaults.
- **Effective/efficient**: fewest clicks to the primary action; empty states
  that offer the next step; no dead-end navigation.

---

## 4. Definition of Done — every module is a vertical slice

1. **Data layer** — read functions (in the module's `data.ts` or equivalent)
   via the Supabase client, scoped by RLS.
2. **Validation** — Zod schema in `packages/validation`.
3. **Server actions** — mutations with re-auth, `canPerform`/role guards,
   `activity_events` + `audit_events` recording, `revalidatePath`.
4. **Migration** (only if a table is missing) — never weaken RLS; add
   policies + SQL tests in `supabase/tests/`.
5. **UI with every state** — happy path, no-permission, empty, loading
   (skeleton), stale/error, archived/immutable; responsive; light/dark;
   fluid animation + (where safe) optimistic updates; keyboard + visible
   focus + screen-reader labels; respects `prefers-reduced-motion`.
6. **Tests** — unit tests (Vitest) for domain rules; extend e2e where it
   makes sense.
7. **Docs** — mark the task ✅ in this doc set with the PR link and the
   actual checks run.

---

## 5. Groups, phases, and where to find them

- **Group 1 — Command** (internal app, `apps/command`): see
  `docs/rebuild/command/*.md`.
- **Group 2 — Portal** (client app, `apps/portal`): see
  `docs/rebuild/portal/*.md`.
- Aggregate status table: `docs/rebuild/STATUS.md`.

Full narrative plan (context, rationale, file pointers) also lives in the
session's plan file if you have access to it; this doc set is the
authoritative, durable version that lives in the repo.

---

## 6. Non-negotiables (inherited from `reference/CLAUDE.md`)

No production credentials/secrets/service-role access. No direct push to
`main`. No self-merge. Never weaken RLS, audit, approvals, or finance
invariants to move faster. No business-rule invention — if a rule isn't
specified, ask or default to the existing pattern and say so. No secrets in
code, logs, docs, or screenshots.
