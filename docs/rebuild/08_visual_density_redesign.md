# KSP OS visual-density redesign

Status: 🧪 built / review required · Branch: `feat/visual-home-density` · 2026-08-23

## Outcome

Make Command and Portal understandable in roughly five seconds. The Home is a
decision surface, not a compressed report: show what needs attention, what is
moving, and where to drill down. Details remain available through progressive
disclosure and full module views.

## Observed baseline

- Command Home could render five metric cards, ten queue cards, quick links,
  project cards, team load and intervention cards at once.
- Portal Home repeated the same card treatment for the greeting, actions,
  projects, dates, deliveries and quick access.
- Milestone creation exposed title, phase, start date and target date together,
  even though only the title is required.
- The interface used color and pills, but lacked a stable visual grammar for
  recognizing object types before reading their labels.

## Interaction contract

1. One dominant question per Home: **what needs me now?**
2. A maximum of five queue rows on the first layer.
3. Repeated items share one surface with dividers; each item is not its own card.
4. Secondary context is collapsed or lives in the destination module.
5. Shape, icon, text and color work together; color is never the only cue.
6. Semantic risk/success colors do not change when the accent palette changes.

## Visual grammar

| Object | Shape | Default icon | Reading |
|---|---|---|---|
| Work / action | Circle | Focus or check | Continuous execution |
| Project / container | Rounded square | Projects | Bounded work area |
| Milestone / date | Diamond | Calendar | Point on a path |
| Attention / decision | Triangle | Decision | Requires judgment or intervention |

The grammar is implemented by the shared `ShapeMark` primitive. Every mark has
an accessible label and an icon, so the distinction survives low vision,
grayscale and user-selected palettes.

## Reference decisions

- [Linear project overview](https://linear.app/docs/project-overview): brief
  summary first; detailed properties and resources remain available in context.
- [Linear project milestones](https://linear.app/docs/project-milestones):
  milestone creation is lightweight, dates are optional, and a diamond is the
  repeated milestone cue.
- [Notion database views](https://www.notion.com/help/views-filters-and-sorts):
  the same source can have list, board, timeline, calendar and chart views;
  property visibility is configured per view.
- [ClickUp custom statuses](https://help.clickup.com/hc/en-us/articles/6309452618647-Manage-task-statuses):
  status vocabularies can match the workflow, while broad status groups retain
  consistent meaning.
- [Asana task types](https://help.asana.com/s/article/different-types-of-tasks?language=en_US):
  milestones are treated as a distinct work type rather than a normal task with
  extra fields.

These products informed behavior, not visual imitation. KSP keeps its own
typography, category shapes, palette system and role-aware Command cockpit.

## Delivery plan

### D0 — Shared visual language — implemented

- `ShapeMark` for circle, square, diamond and triangle categories.
- `ProgressRing` for compact project and opportunity progress.
- Persisted Dominion, Ocean, Ember and Forest accent palettes.
- Palette controls in both desktop shells and the Command mobile module sheet.

### D1 — Both Homes — implemented

- Command: five-item focus queue, one visual pulse surface, one active-path
  surface and collapsed contextual detail.
- Portal: right-now actions, four-signal summary, project progress paths,
  milestone timeline and collapsed recent activity.
- Quick access moved into the page header instead of a separate card section.

### D2 — Projects and milestones — implemented first slice

- Milestone rows use the shared diamond cue and status tone.
- Quick add now shows only name and target date.
- Phase and start date moved under **More options**.

### D3 — Remaining module-density pass — next

Apply the same rules to the highest-density modules in this order:

1. Workspace, Today, Signals and Decisions.
2. Revenue, Clients, Content and Finance.
3. Portal Projects detail, Approvals, Requests, Files and Invoices.
4. Remaining Command list/detail views.

For each module: identify its dominant job, cap first-layer properties, choose
one default visual view, move optional metadata into details/side panels, and
retain list/table views for exact inspection.

### D4 — Personal layout preferences — later

- Persist compact/comfortable density per user.
- Persist default view and hidden properties per module.
- Allow role-level defaults without weakening server-side permissions.

## Acceptance criteria

- Both Homes expose no more than four primary surfaces above progressive detail.
- No first-layer queue displays more than five rows.
- Milestone quick add succeeds without opening optional fields.
- Palettes persist across reloads and work in light/dark mode.
- Shape distinctions remain understandable without color.
- Desktop and 375px mobile layouts have no horizontal page overflow.
- Typecheck, lint, tests and both production builds pass before release.

## Anti-template review

Scale: `0` product-specific · `4` highly generic.

| Dimension | Score | Evidence / correction |
|---|---:|---|
| Composition | 1 | Repeated cards became shared surfaces; role/action hierarchy remains KSP-specific. |
| Typography | 1 | Existing Inter + Bricolage roles preserved; figures remain tabular. |
| Color | 0 | KSP default retained, semantic tones separated from four optional accent palettes. |
| Components | 1 | Category shape grammar and role-aware pulse replace interchangeable KPI cards. |
| Images | N/A | No decorative stock or generated imagery is needed for an operations Home. |
| Copy | 1 | Meta-design phrases were removed; copy names real work, actions and publication state. |
| Motion | 1 | Existing restrained transitions only; reduced-motion contract remains intact. |
| Content | 0 | Every count and progress ring derives from existing records; no filler metric added. |
| Details | 1 | Milestone quick-add and collapsed context are specific to the KSP workflow. |

Elements preserved: role-specific Command cockpits, real pipeline/finance counts,
client-publication boundaries, KSP typography and the purple/lime default. Verdict:
`REVIEW_REQUIRED` until the actual applications are inspected at desktop and
375px after a successful production build.

## Risk and rollback

This slice changes presentation only: no data model, RLS, permission, mutation
or audit contract changed. Rollback is a normal code revert. The palette is
local presentation state (`localStorage`) and defaults safely to Dominion.
