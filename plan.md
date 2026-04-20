# Verde — Sprint History and Backlog (plan.md)

Compressed record of Sprints 3–17 plus consolidated follow-up backlog.

**Plan-bloat prevention policy (from Sprint 16):** at any time, only the
three most recent *decision-bearing* sprints are retained in full detail.
All earlier sprints collapse to one-line rows in the index table below —
`git log` + sprint tags are the authoritative source for their
commit-level detail. Compression-only sprints (like Sprint 16 itself) do
not consume a detail slot, and probe-only refinement sprints occupy one
slot at whatever density their outcome requires (often < 50 lines).
Currently detailed: Sprint 14 / 15 / 17. A planner adding a new sprint
section must demote the now-oldest detailed sprint into the index row in
the same commit.

## Sprint 3–13 summary index

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
| 13     | Catalogue re-evaluation, no situation change                                    | Docs `651306c` — `openModules` probe confirmed 2 sites (still rule-of-two); A / C / four follow-ups unchanged; tests 32/32. Tail advisory: a third refinement-only sprint would argue for product conversation. |

Sprint 5 sweep non-i18n catalogue (technical identifiers, not localization targets — future sweeps should skip): `Sidebar.tsx:12–15` emoji icons; `App.tsx:121` dev console.log; `Editor.tsx:89` CSS font stack.

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

# Sprint 17 — Probe-only refinement; one new backend-gated follow-up surfaced

## Goal

Run a probe set *orthogonal* to Sprints 15 / 16 type-bypass scans
(`TODO|FIXME|XXX`, `any\b`, `// eslint-disable`) to test whether drift
since Sprint 15 has accreted new Tidy signals. Secondary goal: promote
the plan-bloat policy from example to explicit rule in the preamble.

## Probes executed (3 of 3 budget)

1. `rg "TODO|FIXME|XXX" src/` — 2 hits. `App.tsx:155` matches backlog
   #1 (already catalogued). **`App.tsx:211` is NEW**: `// TODO: wire
   ConflictDialog here once the backend reports file-vs-Excel content
   conflicts (different from EXCEL_OPEN...)`. Backend-gated on a new
   error-kind distinct from EXCEL_OPEN. Logged as backlog #12.
2. `rg "\bany\b" src/ --type ts` — 2 hits, both natural-language "any"
   in `App.test.tsx` comments (not the `any` type). False positives.
3. `rg "// eslint-disable" src/` — 0 hits.

Sprint 15 bypass re-probe (`\!\.`, `as\s+[A-Z]`) skipped: no `src/**`
commit since `8e15c3d`, so the result would be identical. Re-run
deferred to the first sprint following any src-level change.

## Decision

**Probe-only, no code change, no sprint tag.** The `App.tsx:211` TODO
is backend-gated wiring work (not rule-of-three duplication); Sprint
15's technical-Tidy exception does *not* extend to it. One docs commit.
Tests / tsc / cargo untouched.

## Key decisions

- **Orthogonal probe axis is the anti-theatre mechanism**: `TODO`
  scanning is independent of Sprints 15 / 16 bypass scans. A truly
  exhausted pool must return empty on both axes; one non-empty probe
  (this sprint's `App.tsx:211`) validates the exercise.
- **Plan-bloat policy promoted from example to rule**: preamble now
  states the forward-looking "three most recent detailed" rule
  explicitly; Sprint 13 demoted to the index table in the same commit
  to demonstrate the rule (not a backlog bankruptcy).
- **Escalation signal compounding**: Sprint 14 escalated, Sprint 15
  took a technical exception, Sprint 17 surfaces a backend-gated TODO.
  Three distinct sprints pointing at external input as the binding
  constraint — this is the case for an out-of-band product conversation
  rather than a Sprint 18 default silent re-probe.

## Follow-ups

- Sprint 18: prefer out-of-band product / backend conversation over
  a fifth consecutive silent cycle.
- Re-run bypass probe (`\!\.`, `as\s+[A-Z]`) after the next `src/**`
  change; current skip must not calcify.
- Backlog #12 is a Planning pickup (not a Tidy) once the backend
  error-kind lands: dialog + routing both need design.

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
| 12  | `App.tsx:211` ConflictDialog wiring for content-conflict reporting | S17         | Backend emits a content-conflict error-kind distinct from EXCEL_OPEN |

## Intentional Pause (2026-04-21 以降)

Sprint 12 / 13 / 14 / 17 の refinement-only と Sprint 15 の技術例外
（`main.tsx` 非 null 断言除去 — arc completion 目的の one-time exception）
により、product input 不在のサイクルが実質 5 連続に達した。Sprint 18
以降について、巡回側の自動起動による silent probe / refinement-only
cycle を**停止**する。Sprint 17 の Follow-ups で既に out-of-band
product / backend 会話が推奨されており、本セクションはその推奨を
「次サイクルをデフォルト起動しない」という**明示的な停止指示**に昇格
させる durable signal である。

**再開条件**（いずれか 1 つが成立すれば Sprint 18 を正規起動）:

- (a) backlog #1 — `TrustGuideDialog` が参照すべき Verde docs URL が
  product 側で確定し、文言 / リンクが planner に伝達される。
- (b) backlog #12 — backend が content-conflict を `EXCEL_OPEN` と
  区別される error-kind として発出するようになり、`App.tsx:211` の
  ConflictDialog wiring が Planning ピックアップ可能になる。
- (c) 上記以外の新規 PBI が stakeholder から明示的に投入される
  （rule-of-three / restructure PBI / UX 改善 など、種別問わず）。

**Pause 中にやらないこと**:

- 同一 probe set の 5 回目の silent re-run。
- Sprint 15 のような technical-exception Tidy の自己発見。arc completion
  相当の明確な正当化がない限り、planner 自発の code change は追加しない。
- 本 Pause セクションの書き換えによる条件緩和。再開条件は stakeholder
  側からの signal で解除されるべきもので、planner 側での再解釈で解除
  してはならない。

**Pause 中にやること（再開前提の小作業のみ）**:

- 新規 commit / issue / PR が `main` に到着した際に、(a)(b)(c) のいずれか
  に該当するか判定し、該当すれば Sprint 18 Planning に移行。
- 再開条件を満たす signal が到着しないまま十分な時間が経過した場合、
  Pause そのものを「backlog bankruptcy が近い」という escalation signal
  として product チャネルに再提示することは可（ただしこれも Pause を
  planner 単独で解除する手段ではない）。

