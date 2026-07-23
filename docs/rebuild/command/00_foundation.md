# Phase C0 — Foundation: Design System, Theme, Shell

Group: Command · Status: ✅ done & verified (see checks log at the bottom)

Goal: replace the blue/navy "executive" light-only theme with an Asana-style
design system in KSP's brand colors (purple primary, green accent), with a
working dark/light toggle, and rebuild the app shell (sidebar, top bar,
mobile nav) to match.

## Tasks

| Task | Status | What it does | Files |
|---|---|---|---|
| C0.1 Tokens & theme | ✅ | CSS variables for both themes; Tailwind config reads them via `rgb(var(...) / <alpha-value>)` so every existing `bg-brand`/`text-ink`/etc. class re-themes automatically. Legacy `ksp.*`/`executive`/`paper` tokens remapped onto the new brand vars so old screens (login/setup) inherit the identity for free. | `tailwind.config.ts`, `apps/command/app/globals.css` |
| C0.2 ThemeProvider + toggle | ✅ | Anti-flash: a plain-string script (`themeInitScript`) inlined in `<head>` sets `data-theme` before paint. `ThemeProvider`/`useTheme()` track preference (`system`/`light`/`dark`), persist to `localStorage` (`ksp-theme`), and react live to OS theme changes when on "system". `ThemeToggle` is a sun/moon icon button wired into the top bar and the mobile "More" sheet. | `packages/ui/src/theme-script.ts`, `packages/ui/src/theme.tsx`, `apps/command/app/layout.tsx` |
| C0.3 Primitives + icons | ✅ | New shared primitives in `packages/ui`: `Button` (primary/secondary/ghost/danger, with press/hover/focus micro-interactions), `IconButton`, `Card`, `Badge`/`Dot` (tone system), `Avatar` (deterministic color by name), `Skeleton`, `Spinner`, `EmptyState` (icon + title + hint + action), `Segmented`. A hand-rolled line-icon set (`Icon`, 24x24 stroke, `currentColor`) covers every nav module plus common UI actions — no icon library dependency. | `packages/ui/src/primitives.tsx`, `packages/ui/src/icons.tsx` |
| C0.3b Motion system | ✅ | CSS-only (transform/opacity) — no animation runtime dependency added. Tokens (`duration-fast/DEFAULT/slow`, `ease-standard`) and keyframes (`fade-in`, `fade-slide-up`, `scale-in`, `slide-in-right`, `shimmer`) in `tailwind.config.ts`. `Reveal`/`Stagger` components for entrance animation with optional per-item delay. Honors `prefers-reduced-motion` globally. | `packages/ui/src/motion.ts`, `packages/ui/src/motion-react.tsx`, `apps/command/app/globals.css` |
| C0.4 Shell rebuild | ✅ | Asana-style shell: collapsible sidebar with icon+label nav, in-sidebar module search/filter, workspace brand mark; top bar with quick-create menu, notifications button (UI only — wiring is C6.4), theme toggle, avatar menu (sign-out); right-aligned page-transition fade on route change; mobile bottom-nav + "More" sheet (unchanged interaction model, restyled). | `apps/command/app/(app)/_components/shell.tsx` |
| C0.5 Nav/IA update | ✅ | Added `icon: IconName` to every `NavItem`. Added the **Workspace** module to the Execution group (`/workspace`, planned) to reconcile the screenshot Kauan shared — a general team task hub, reusing the existing `tasks` table once built (Phase C3). All other 17 modules unchanged. | `apps/command/lib/nav.ts` |
| C0.6 Living docs | ✅ | This doc set. | `docs/rebuild/**` |

## Design decisions worth knowing

- **Purple = primary, green = accent.** Purple drives navigation, primary
  buttons, focus rings, active states. Green is reserved for success states,
  100%-complete progress rings, and small brand accents (e.g. the tick in the
  wordmark) — not a second primary color, to protect legibility.
- **`--on-brand` / `--on-accent`** tokens exist because purple and green both
  flip in dark mode (lighter, for contrast against a dark canvas) — a fixed
  "white text on brand" assumption would fail contrast in dark mode. These
  tokens give correct contrast in both themes without per-component logic.
- **No new UI dependency.** Icons and motion are hand-rolled (SVG + CSS) to
  keep bundle size and review surface small, per the repo's "no unapproved
  dependency" rule. If a richer icon/animation library is wanted later, raise
  it as its own decision.
- `packages/ui` was previously a single unused `WorkspaceShell` component
  (confirmed zero imports) — it's been fully replaced by the primitives
  above; nothing was silently dropped.

## Verification actually run

See `docs/rebuild/STATUS.md` verification log for the exact commands and
their results for this PR. Manual check: toggled dark/light in the running
dev server, resized to 375px/tablet/desktop, tab-navigated the sidebar and
menus to confirm visible focus.
