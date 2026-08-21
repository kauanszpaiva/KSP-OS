# Founder Second Brain — KSP Frontend Blueprint Adoption

**Status:** implementation in progress  
**Baseline:** `main` after PR #78 (`a86302586a272ad765080208a6099254e1e36761`)  
**Reference:** Kauan-provided 50-screen KSP OS Command visual product blueprint (2026-08-21)

## Intent

Adopt the new KSP OS frontend system for the already-released Founder Second Brain without creating another application, duplicating Company OS truth, weakening Founder access controls, or changing the MCP/data contracts merely for visual consistency.

The frontend blueprint is a product-system reference, not a mandate to reproduce every illustrative metric. Founder OS continues to expose only real data. Decorative productivity, energy, focus, or performance scores are intentionally excluded unless a future domain model supplies auditable values.

## Design contract

The Founder experience should feel like the private expression of the same KSP OS product family:

- responsive shell: bottom navigation on mobile, icon rail on tablet, full grouped sidebar on desktop;
- top-level search and quick-create actions are reachable without opening a dashboard maze;
- shallow daily navigation, with deeper Truth/Context/Agent controls grouped underneath;
- list-to-detail and compact-row patterns preferred over repeated card grids;
- light and dark themes share the same semantic tokens;
- brand purple is action/navigation, green is reserved for positive/completed state;
- loading, empty, error, permission, offline and destructive states are part of the interface contract;
- no fake metrics, dead controls, broad gradients, decorative glass UI or generic AI-assistant filler.

## Second Brain mapping

The blueprint's Founder OS concept is mapped onto the existing private Brain model:

- **Capture** → `founder_inbox_items`
- **Ideas / private project thinking** → existing Founder routes
- **Truth** → `founder_truth_items`
- **Sources / provenance** → `founder_sources`
- **Context Packs** → `founder_context_packs`
- **Handoffs** → `founder_handoffs`
- **AI Inbox / AI Access** → existing founder-only agent surfaces and MCP
- **My Work / Vault** → existing private tasks and vault
- **Company OS** remains a separate context; founder-private records are never silently promoted into company truth.

## Vertical slices

### Slice 1 — shell + home

- grouped responsive Founder navigation;
- direct Truth and Sources navigation;
- global Second Brain search entry point;
- real quick-create menu;
- mobile More sheet;
- one-field private quick capture;
- Founder Home rebuilt around real Brain status, Continue, Needs Attention and Knowledge Control.

No database, RLS, authorization, OAuth or MCP schema change is required for this slice.

### Slice 2 — knowledge control

Bring Inbox, Knowledge, Truth and Sources onto the same list/detail, filter, search, status and provenance language. Preserve capture-first behavior and human trust upgrades.

### Slice 3 — context + agents

Standardize Context Packs, Handoffs, AI Inbox and AI Access. Make agent scopes, source provenance and returned work legible without turning the product into a chatbot dashboard.

### Slice 4 — product-system completeness

Apply the blueprint's shared responsive states, filters, detail headers, drawers/sheets, accessibility checks and visual regression coverage to the remaining Founder routes.

## Non-goals

- no new Second Brain database;
- no duplicate Company OS projects/tasks/finance/Canon;
- no service-role MCP path;
- no new permission bypass;
- no production migration as part of the visual rollout;
- no claim that a decorative mockup metric is real.

## Verification contract

Each slice must pass the affected TypeScript, lint, format, unit/navigation tests and Command build. Preview should be inspected at desktop/tablet/mobile widths before any production merge. Founder routing and RLS remain independent gates and must not be weakened by UI changes.
