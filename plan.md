# Verde — Sprint History and Backlog (plan.md)

Compressed record of Sprint 3–15 outcomes plus consolidated follow-up
backlog. Sprints 13 / 14 / 15 retained with decision-grade detail as
load-bearing inputs for Sprint 16+ planning; earlier sprints collapsed
to a one-line index since `git log` is the authoritative source for
their implementation detail.

## Sprint 3–12 summary index

| Sprint | 主題                                                                            | 主要コミット                                                                    |
| ------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 3      | Exhaustive error propagation and UI coverage                                    | `14e9525` hooks unify error propagation; `ec3ac51` route all `ParsedError` kinds; `9e4692a` keep locked out of generic banner; `2a71aca` extract `Banner` (docs `d285a79`). |
| 4      | Loading-flag symmetry and banner i18n                                           | `1bd5c5a` unify loading-flag lifecycle; `f8df5f0` i18n saveBlocked / excelOpen banners; `d24fe37` extract `setupOpenedProject` helper (docs `50ee5b4`). |
| 5      | File-dialog filter i18n and hardcoded-English sweep                             | `2bd8fd4` i18n Excel filter name; `167bc95` characterize filter wiring (docs `3d85058`). |
| 6      | A11y on TabBar close button and `checkConflict` visibility                      | `284a1dc` add TabBar `aria-label`; `0c580b3` warn on `checkConflict` silent failure; tests `7d6b137` / `8fce7e2` (docs `f639b07`). |
| 7      | `setActiveModule` signature honesty (`null!` removal)                            | `71cf499` widen signature; `08c1670` test null transition; `2e31204` drop `null!` (docs `f25d4e4`). |
| 8      | `SAVE_BLOCKED_READONLY` sentinel characterization (hook side)                   | `77f3259` pin sentinel contract across read-only save (docs `98831a0`). |
| 9      | App-side `saveBlocked` banner consumer characterization                         | `fc276f8` pin banner render path for sentinel consumer (docs `8e2e961`). |
| 10     | Residual `key!` force-cast Tidy in `error-parse.test`                           | `dcdac42` narrow `key` type guard (docs `b0f470c`). |
| 11     | Residual `path as string` cast Tidy in `handleOpenFile`                         | `d024997` drop redundant cast (docs `15233cf`). — closes type-bypass arc for `src/**` (incomplete; `main.tsx:9` missed, reopened in Sprint 15). |
| 12     | Backlog refinement only, candidates A / B / C enumerated                        | Docs `635a1af` — no code changes; rule-of-two Candidate B, product-gated A, restructure-PBI-gated C. |

Sprint 5 sweep non-i18n catalogue (technical identifiers, not localization targets — future sweeps should skip): `Sidebar.tsx:12–15` emoji icons; `App.tsx:121` dev console.log; `Editor.tsx:89` CSS font stack.

# Sprint 13 — Catalogue re-evaluation, no situation change

## Goal

Re-evaluate the Sprint 12 candidate catalogue (A / B / C) and the four
external-input-gated follow-ups after one sprint's elapsed time.
Explicitly confirm no situation change has promoted any candidate to
"ready for execution" and record the re-evaluation so Sprint 14 starts
from a refreshed (not re-probed) backlog.

## Scope

- Re-scan `src/**` for the Candidate B signal — a third `openModules`
  call site using a "match by filename" predicate.
- Confirm Candidates A and C retain their "why not now" rationale.
- Confirm all four follow-ups remain external-input-gated.
- **No code change**, **no sprint tag** — refinement-only.

## Re-scan findings

Probe: `rg "openModules\.(find|filter|some|every|map|reduce)"` across
`src/**/*.{ts,tsx}`. Three occurrences, matching Sprint 12:

| Location        | Expression                                               | Pattern                  | Counts toward B? |
| --------------- | -------------------------------------------------------- | ------------------------ | ---------------- |
| `App.tsx:174`   | `openModules.find((m) => m.filename === mod.filename)`   | filename-match           | yes              |
| `App.tsx:185`   | `openModules.filter((m) => m.filename !== mod.filename)` | filename-match (negated) | yes              |
| `TabBar.tsx:32` | `openModules.map((mod) => {...})`                        | enumeration              | no               |

`TabBar.tsx:32` is list render, not a filename predicate — counting it
toward B would dilute rule-of-three into rule-of-"any use of the same
variable", which Sprint 4's `withLoadingState` deferral rejected.
Candidate B remains rule-of-two.

## Candidate / follow-up re-evaluation

- **Candidate A** (`handleKeepFile` / `"verde"` naming): still blocked
  on product / docs decision about canonical user-facing vocabulary.
- **Candidate C** (`App.tsx` 352 LOC split): no second error-routing
  consumer, no restructure PBI scheduled. Gate unchanged.
- **Four follow-ups** (TrustGuideDialog URL, Sprint 5 low-priority
  i18n, `withLoadingState`, structured `checkConflict` logging): all
  remain parked on original external gates.

## Decision

**Sprint 13 is refinement-only, no situation change.** One docs commit
(`651306c`); no sprint tag (consistent with Sprint 12 — tags mark
executable milestones for bisect, and re-evaluations have nothing to
bisect to). `bun run test` 32/32; `tsc --noEmit` clean; cargo untouched.

## Key decisions (condensed)

- **Two consecutive refinement-only sprints is a signal, not a failure**
  — manufacturing execution burns prioritization trust.
- **`TabBar.tsx:32` excluded from Candidate B count**: rule-of-three is
  "same pattern", not "same variable". Documented to prevent future
  miscounting.
- **Re-scan executed despite untouched code**: elapsed time carries
  non-zero probability of new call sites from unrelated feature work;
  probe cost (1 `rg`) is trivial.

## Follow-ups

Sprint 14 should either (a) re-run the same probe if no new PBI
lands, or (b) pick up fresh product input. A third consecutive
refinement-only sprint is acceptable but argues for a proactive
product / PBI conversation rather than another silent re-scan.

# Sprint 14 — Third consecutive refinement-only, escalate to product conversation

## Goal

Honor Sprint 13's tail instruction: re-run the same probe set, confirm
Candidate B signal and A / C / follow-up gates unchanged, and — crucially
— escalate the advisory from "acceptable but argues for proactive
conversation" to an **explicit recommendation** for a product / PBI
dialogue before Sprint 15. Three consecutive silent re-scans are the
threshold where continuing to probe without fresh input starts burning
sprint budget that would yield more value from stakeholder engagement.

## Scope

- Re-run probes: `rg "openModules\.(find|filter|some|every)"`; `git
  log --oneline -5` for new PBI arrival signal.
- Confirm Candidates A / C and four follow-ups unchanged.
- **No code change**, **no sprint tag**.
- **New**: explicit escalation note — Sprint 15 should not silently
  re-probe; either a product / PBI conversation surfaces a fresh
  target, or the planner documents why a fourth consecutive re-scan
  is justified.

## Re-scan findings

- `git log --oneline -5`: no new commits since Sprint 13's `651306c`;
  five most recent are docs / refactor from Sprints 10–13. **No new
  PBI has landed.**
- `rg "openModules\.(find|filter|some|every)"`: same two `App.tsx`
  sites (`:174` find, `:185` filter). **No third filename-predicate
  call site has accreted.**

Working tree: clean.

## Candidate B re-confirmation

Rule-of-two, unchanged from Sprint 12 / 13. Continues to defer.

## Candidate A / C / follow-up re-evaluation

- **Candidate A**: no UX / docs pass landed. Gate unchanged.
- **Candidate C**: no second error-routing consumer, no restructure
  PBI scheduled. Gate unchanged.
- **Four follow-ups**: product decisions, telemetry, rule-of-three
  evidence all remain unavailable.

## Decision

**Sprint 14 is refinement-only, same as Sprint 12 / 13.** Docs commit
`951c55c`; no sprint tag. **Advisory escalated** — Sprint 15 planning
should include proactive product / PBI conversation. Tests 32/32;
tsc clean; cargo untouched.

## Key decisions (condensed)

- **Three consecutive refinement-only sprints crosses the escalate
  threshold**: silent re-scans scale O(sprint) while candidate pool
  is O(1) — continuing turns backlog hygiene into backlog theatre.
- **"Escalate" is not "abandon"**: existing candidates / follow-ups
  remain valid backlog items; escalation means "seek the input that
  would unblock one of them".
- **Sprint 14's escalation must survive into Sprint 15 planning**:
  this section is the durable signal a future planner sees before
  another silent re-probe.

## Follow-ups — Sprint 15 guidance (explicit)

1. Before any code-level probe, surface the backlog state to product
   / PO channel: share the four gated follow-ups and Candidates A / B
   / C with current "why not now" notes; ask which (if any) has moved.
2. If product surfaces a fresh PBI, pick it up via normal Planning.
3. If product confirms no movement, document the confirmation and
   consider either (a) deliberately-chosen rule-of-two Tidy with
   rule-relaxation rationale, or (b) a test-coverage / observability
   investment that doesn't depend on external gates.
4. If neither is viable, Sprint 15 may return to refinement-only — but
   must explicitly record why escalation did not yield a pickup.

# Sprint 15 — Type-bypass arc completion for `main.tsx` root lookup

## Goal

Close the last remaining non-null assertion under `src/**`:
`document.getElementById("root")!` at `src/main.tsx:9`. Sprint 11's
plan.md declared the "type-system bypass" arc complete with a
post-sprint grep, but that probe concentrated on
`src/App.tsx` / `src/hooks/` / `src/components/` and missed the
entry-point residual. Sprint 15 rectifies the claim and finishes the
arc by guard-ing the root element lookup.

## Path chosen

Sprint 14 offered four paths: (1) proactive product/PBI conversation —
out-of-band channel unavailable; (2) fresh PBI pickup — none arrived;
(3) **chosen**: deliberate Tidy with explicit rationale — `src/**` probe
surfaced an entry-point non-null assertion, *not* a rule-of-two
duplication, so rationale is "arc completion / prior probe correction"
rather than rule relaxation; (4) observability / test-coverage — not
needed since path 3 yielded a concrete deliverable.

## Scope

- Replace `createRoot(document.getElementById("root")!).render(...)`
  with a lookup → guard → createRoot sequence that throws a named
  `Error("Root element #root not found")` if the DOM lacks the
  expected mount point.
- No test added: `main.tsx` is the composition root; testing it would
  require jsdom-ing a full document tree just to assert "throws on
  missing #root". Regression surface is `tsc --noEmit` plus the 32-test
  suite exercising App tree behavior.
- No new dependencies, no locale keys.

## Probes executed (3 of 3 budget)

1. `rg "openModules\.(find|filter|some|every)"` across `src/**` —
   confirmed Candidate B still rule-of-two (2 sites at `App.tsx:174`
   / `:185`). No change since Sprint 12–14.
2. `rg "\bas\s+(string|number|boolean|unknown|any)\b|:\s*any\b|<any>|!\s*[.)\]]"` —
   surfaced two hits: `monaco-vba.ts:89` (false positive — regex
   literal `[=<>!]+`) and **`main.tsx:9` (genuine non-null assertion)**.
   This is the Tidy target.
3. `rg "^export\s+(function|const|class|interface|type)\s+"` —
   confirmed no obvious dead-export candidates.

Dead-code (c), test-hygiene (d), and naming (e) candidates from the
brief were not pursued: (c) no high-confidence targets; (d) existing
test helpers already carry the discipline; (e) no concrete surface.

## Changes landed (on `main`, not pushed)

| Commit  | Type         | Summary                                                 |
| ------- | ------------ | ------------------------------------------------------- |
| 8e15c3d | refactor(ui) | Guard root element lookup instead of non-null assertion |
| 22cd27c | docs         | Record Sprint 15 plan and outcomes                      |

## Acceptance criteria (verified)

- `bun run test` — all green (**32** tests across 5 files)
- `bun run tsc --noEmit` — clean (exit 0)
- `cargo` — untouched

## Key decisions

- **Arc completion, not rule-of-three relaxation**: Sprint 14's
  guidance (3a) mentioned "deliberately-chosen rule-of-two Tidy with
  rule-relaxation rationale documented". Sprint 15's target is a
  *single* non-null assertion at an entry point, not a rule-of-two
  duplication pattern. Rationale category is "prior claim correction
  + arc completion", not "rule relaxation". A future planner reading
  "Sprint 15 executed despite rule-of-two" should not infer a general
  relaxation of the rule-of-three gate.
- **Named `Error` over React's implicit `TypeError`**: React's
  `createRoot(null)` emits a `TypeError` whose message depends on
  React version and is hard to recognize in an error log. A named
  error at the boundary is one grep away from the diagnosis. Behavior
  diff is restricted to error diagnostic text — the app still
  fails-fast at the same point, with a clearer signal.
- **No unit test for the guard**: `main.tsx` is the composition root;
  the guard is 4 lines with trivially inspectable behavior, and the
  real regression surface (someone removes `<div id="root">`) would
  be caught by any smoke test that boots the app.
- **Sprint 11's claim corrected, not just extended**: Sprint 11 stated
  the arc was complete; this section explicitly acknowledges that
  probe missed the entry-point file so future planners can calibrate
  trust in past probes.
- **Two-commit shape preserved (refactor + docs)**: consistent with
  Sprints 7 / 10 / 11; bundling would pollute `git blame` on
  `src/main.tsx`.

## Follow-ups (out of Sprint 15 scope)

- All four Sprint 11 external-gated follow-ups remain unchanged.
- Sprint 12 Candidates A / C unchanged; **Candidate B** unchanged but
  worth re-confirming once any new feature touches tabbed-module state
  (e.g. a "focus next tab by filename" handler would be the third
  call site tipping B into execution range).
- **Post-Sprint 15 bypass status**: one more targeted probe
  (`rg "\!\." src/` + `rg "as\s+[A-Z]" src/`) should be added to the
  Sprint 16+ planning checklist before declaring the arc closed again.
  The Sprint 11 probe pattern (limit search to App/hooks/components)
  is now a known blind spot.
- Sprint 16 default: re-run the product / PBI escalation prompt from
  Sprint 14's tail guidance. Sprint 15 executed a technical Tidy
  without product input; that is a one-time exception for arc
  completion, not a new autonomy charter.

# Consolidated open follow-up backlog

Deduplicated across Sprint 3–15. Closed items omitted (already applied
in a later sprint — see git log). Each open item lists its original
source and the external gate blocking execution.

| #   | Item                                                             | Source sprint | Gate                                              |
| --- | ---------------------------------------------------------------- | ------------- | ------------------------------------------------- |
| 1   | `TrustGuideDialog` URL / docs reference review                   | S3 / S4 / S5  | Verde-owned docs page product decision            |
| 2   | Sprint 5 low-priority i18n — `StatusBar.tsx` `"ID: "` prefix     | S5            | Product decision (labels often untranslated)      |
| 3   | Sprint 5 low-priority i18n — `StatusBar.tsx` `"VBA"` lang tag    | S5            | Product decision (proper noun, usually untranslated) |
| 4   | Sprint 5 low-priority i18n — `WelcomeScreen.tsx` `"Verde"` brand | S5            | Product decision (brand, usually untranslated)    |
| 5   | Optional `withLoadingState` helper                               | S4            | Rule-of-three evidence (currently rule-of-two)    |
| 6   | Structured logging for `checkConflict`                           | S6            | Telemetry noise evidence post-warn shipment       |
| 7   | Candidate A — `handleKeepFile` / `"verde"` naming asymmetry      | S12           | Product / UX decision on canonical vocabulary     |
| 8   | Candidate B — `openModules` filename-filter helper extraction    | S12           | Third call site (currently 2 at `App.tsx:174/185`) |
| 9   | Candidate C — `App.tsx` (352 LOC) responsibility split           | S12           | Restructure PBI with explicit test-refactor scope |
| 10  | Post-Sprint 15 bypass re-probe in Sprint 16+ checklist           | S15           | Planning-process update (Sprint 11 blind spot)    |
| 11  | Sprint 16 default: re-run product / PBI escalation prompt        | S15           | Sprint 15 was one-time arc-completion exception   |
