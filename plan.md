# Sprint 3 — Exhaustive error propagation and UI coverage

## Goal

Unify async error propagation across `useVerdeProject` mutation hooks and
route every `ParsedError` kind through a localized UI surface, so a
backend failure can no longer escape into a dropped promise or an
untranslated raw string.

## Scope

- Unify `useVerdeProject` mutation hooks (`saveModule`, `syncToExcel`,
  `resolveConflict`) to a single error-handling pattern: record the raw
  backend message in `state.error` and rethrow so callers observe the
  failure.
- Close the exhaustiveness gap in `App.tsx` so every `ParsedError.kind`
  reaches the UI through a single router (`routeParsedError`), with a
  dedicated helper (`handleCaughtBackendError`) at the four catch sites
  to short-circuit `locked` into the `LockDialog`.
- Preserve Kent Beck TDD / Tidy First discipline — every behavior change
  starts from a failing test, and structural tidies land as their own
  `refactor:` commits.

## Changes landed (all on `main`, not pushed)

| Commit  | Type           | Summary                                                                                                |
| ------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| e02fc79 | refactor       | Drop redundant conflict reset and dead ternary branch (Phase 1 tidy-first)                             |
| 14e9525 | feat(hooks)    | Unify async error propagation: `syncToExcel` rethrows, `resolveConflict` gains try/catch + rethrow     |
| ec3ac51 | feat(ui)       | Route all `ParsedError` kinds through localized UI; introduce `errorBanner` state + `routeParsedError` |
| deea21e | test           | Characterize `resolveConflict` error path and `projectNotFound` banner render (TDD iter 1)             |
| 9c9ed1d | test(ui)       | Cover errorBanner dismiss button clears the banner (TDD iter 2)                                        |
| f56e698 | refactor(test) | Extract shared `renderAppWithOpenError` helper in `App.test.tsx`                                       |
| 8f3a855 | test(ui)       | Guard errorBanner against `locked` kind leaking into the generic surface (TDD iter 3)                  |
| 9e4692a | fix(ui)        | Keep `locked` `ParsedError` out of the generic banner via `handleCaughtBackendError` helper            |
| 2a71aca | refactor(ui)   | Extract shared `Banner` component for the three alert surfaces (Phase 6 tidy-after)                    |

## Acceptance criteria (verified)

- `bun run test` — all green (final count: **23** tests across 4 files)
- `bun run tsc --noEmit` — clean
- `cargo` — untouched (no Rust changes in Sprint 3)

## Key decisions

- **Rethrow-vs-sink unified**: every mutation hook now records
  `state.error` AND rethrows, so both state-reading UIs and
  promise-chaining callers observe the failure. The raw backend message
  is preserved (no `Error: ` prefix) so `parseBackendError`'s prefix
  matcher stays the single source of truth.
- **`locked` is short-circuited at the call site**: it carries
  `xlsmPath` context that only the call site knows, and has a dedicated
  UI (`LockDialog`). `routeParsedError` treats `locked` as a no-op to
  make any caller that forgets to short-circuit fail silently rather
  than render a misleading generic banner the user cannot act on.
- **`handleCaughtBackendError` is the single funnel**: all four catch
  sites (`handleOpenFile`, `handleForceOpen`, `handleOpenReadOnly`,
  `handleSave`) delegate to it, keeping the "locked never reaches the
  generic banner" invariant enforced in one place.
- **Generic banner is the new residual surface**: `projectNotFound`,
  `projectCorrupted`, and `generic` kinds all flow through the localized
  `errorBanner`, with `toI18nKey` mapping each variant to its
  `errors.<kind>.{title,message}` namespace.
- **Exhaustive switch with `never`**: `routeParsedError` ends in a
  `_exhaustive: never` default so adding a new `ParsedError.kind`
  without updating the router is a compile error.
- **`Banner` extraction crossed rule-of-three**: the three alert strips
  (save-blocked, excel-open, error) share enough structure that a small
  presentational component removes ~60 lines of duplicated inline
  styling without awkward prop plumbing.

## Follow-ups (out of Sprint 3 scope)

- ~~**Loading-flag asymmetry**: `runOpen` toggles `loading` around its
  work; `saveModule` / `syncToExcel` / `resolveConflict` do not.~~
  Addressed in Sprint 4 (A-stream).
- ~~**`saveBlockedPrompt` / `excelOpenPrompt` still carry hardcoded
  English** ("Dismiss", "Cannot save while Excel has the workbook
  open.").~~ Addressed in Sprint 4 (B-stream).
- ~~**`ConflictDialog` i18n parity**: dialog text has not yet been audited
  for the same localization pass that `routeParsedError` completed for
  banners.~~ Closed in Sprint 5 — Phase 1 probe revealed all
  `conflict.*` keys already in place; no changes needed.
- **`TrustGuideDialog` consolidation**: still has an inline
  `window.open` to a Microsoft support URL with a TODO for a Verde-owned
  docs page.
- **`handleCloseModule` non-null assertion**: `setActiveModule(... ?? null!)`
  still uses `null!` to force-cast past a `null` disallowed by the
  hook's current typing. Worth widening the hook signature rather than
  papering over it.
- **`checkConflict` failure is swallowed silently**: `runOpen` catches
  and drops the error so macOS / no-Excel environments still open the
  file. Should log at least a console.warn so a real regression doesn't
  hide behind the platform-missing case.

# Sprint 4 — Loading-flag symmetry and banner i18n

## Goal

Unify the loading-flag lifecycle across `useVerdeProject` mutation
hooks and eliminate the hardcoded English strings that still lived
inside the `saveBlocked` and `excelOpen` banner prompts.

## Scope

- **A-stream**: add loading toggles to `saveModule` / `syncToExcel` /
  `resolveConflict` via `try { loading:true } catch finally
  { loading:false }`, matching the canonical pattern already in
  `runOpen`.
- **B-stream**: i18n the three remaining hardcoded English strings in
  `App.tsx` banner prompts — two `dismissLabel` props on the
  `saveBlocked` and `excelOpen` banners, and the `excelOpen` body
  message.
- Preserve Kent Beck TDD / Tidy First discipline — every behavior
  change starts from a failing test, structural tidies land as
  separate `refactor:` commits.

## Changes landed (all on `main`, not pushed)

| Commit  | Type           | Summary                                                                           |
| ------- | -------------- | --------------------------------------------------------------------------------- |
| 1bd5c5a | feat(hooks)    | Unify loading-flag lifecycle across mutation hooks                                |
| f8df5f0 | feat(ui)       | i18n `saveBlocked` and `excelOpen` banner prompts                                 |
| 76798cd | test(hooks)    | Characterize loading resets to false after mutation rethrow (TDD iter 1A)         |
| c77c226 | test(ui)       | Characterize `excelOpen` banner i18n wiring (TDD iter 1B)                         |
| 850d08b | test(hooks)    | Characterize loading reflects pending invoke state (TDD iter 2A)                  |
| d24fe37 | refactor(test) | Extract `setupOpenedProject` helper for syncToExcel tests (Phase 6 tidy-after)    |

## Acceptance criteria (verified)

- `bun run test` — all green (final count: **26** tests across 4 files)
- `bun run tsc --noEmit` — clean
- `cargo` — untouched (no Rust changes in Sprint 4)

## Key decisions

- **`runOpen` left unchanged**: it is the canonical template the other
  hooks now imitate. Its inline conflict-check branching is orthogonal
  to the symmetry work and out of scope for this sprint.
- **No new locale keys added**: the B-stream reused `common.dismiss`
  (already present for the errorBanner) and `status.excelOpen.*` (the
  latter aligns with `toI18nKey(excelOpen)`'s mapping, keeping the same
  i18n surface for both the dedicated prompt and any routed fallback
  path).
- **`loading` remains unconsumed by UI today**: symmetry readies future
  spinner wiring without forcing a consumer now. Renaming the field to
  reflect an open-only lifecycle would have been the cheaper
  alternative; we preferred to preserve the more generally-useful
  mutation-lifecycle semantics.
- **Integration test for `excelOpen` banner uses a minimal `<Editor>`
  stub**: exposing the save trigger in jsdom without booting Monaco
  keeps the test fast and avoids a second environment. The stub is
  `vi.mock`'d at module scope so the real Editor is still exercised by
  the app at runtime.
- **Phase 6 tidy skipped one candidate**: a `withLoadingState` helper
  around the try/catch/finally shell would have required awkward
  callback plumbing for the inner success-path variation
  (`setState({ conflict: null })` inside `resolveConflict`, early-throw
  preamble in `saveModule`). The three call sites stay readable as-is;
  extraction was not a genuine win.

## Follow-ups (out of Sprint 4 scope)

- ~~**`ConflictDialog` i18n pass** — still outstanding from Sprint 3.~~
  Closed in Sprint 5 — probe revealed full i18n coverage already present.
- **`TrustGuideDialog` URL / docs reference review** — still pointing
  at a Microsoft support URL.
- **`handleCloseModule` `null!` narrowing** — widen the hook signature
  to accept `null` rather than force-casting.
- **`checkConflict` silent failure path** — at least a `console.warn`
  so a real regression doesn't hide behind the platform-missing case.
- ~~**`"Excel Macro"` file-dialog filter string in `App.tsx`** — Sprint 4
  did NOT address this hardcoded English. Tiny candidate for a
  Sprint 5 i18n follow-up.~~ Closed in Sprint 5 (commit `2bd8fd4`).
- **Optional: `withLoadingState` helper** — adopt only if the
  loading-flag shape proliferates beyond the current three mutation
  hooks.

# Sprint 5 — File-dialog filter i18n and hardcoded-English sweep

## Goal

Close the remaining i18n gap on the file-dialog filter name and
establish a prioritized catalogue of remaining hardcoded English across
`src/App.tsx` and `src/components/*.tsx` for future sprints.

## Scope

- **B-stream**: i18n `"Excel Macro"` filter name in `App.tsx` with a
  new `common.fileTypeExcelMacro` key in en/ja.
- **Sweep**: read-only catalogue of remaining hardcoded English across
  `src/App.tsx` and every file under `src/components/`.
- **A-stream** originally targeted `ConflictDialog` but was found
  already fully i18n'd at probe time — no work needed; the follow-up
  is closed as stale.

## Changes landed (all on `main`, not pushed)

| Commit  | Type      | Summary                                                              |
| ------- | --------- | -------------------------------------------------------------------- |
| 2bd8fd4 | feat(ui)  | i18n Excel file-dialog filter name                                   |
| 167bc95 | test(ui)  | Characterize Excel filter name i18n wiring at the dialog call site   |
| (this)  | docs      | Record Sprint 5 plan, sweep results, and Sprint 3/4 follow-up closures |

## Acceptance criteria (verified)

- `bun run test` — all green (final count: **27** tests across 4 files)
- `bun run tsc --noEmit` — clean
- `cargo` — untouched (no Rust changes in Sprint 5)

## Key decisions

- **`common.fileTypeExcelMacro` chosen over `menu.*`**: the file-type
  label is a reusable surface (any future "choose file" dialog can
  reuse it), not a menu action, so it belongs in `common`.
- **ConflictDialog follow-up closed without modification**: the probe
  revealed full i18n coverage via `conflict.*` keys already in place.
  Documenting this in plan.md is more valuable than manufacturing a
  no-op commit.
- **One characterization test pins the wiring**: the test asserts
  `filters[0].name === t("common.fileTypeExcelMacro")` by inspecting
  the `plugin-dialog` open call arguments, which proves the wiring
  survives any future refactor of `handleOpenFile`.
- **Sprint 5 intentionally small-scoped to validate "probe before
  implement"**: probing ConflictDialog before writing a test prevented
  redundant work on an already-complete target — a pattern worth
  repeating at the start of every follow-up-driven sprint.
- **Phase 6 tidy skipped**: the Sprint 5 diff was intentionally small
  (1 swap + 3 locale lines + 1 test). Genuine structural wins were
  evaluated (locale-key ordering, test-helper reuse, mock consistency)
  and none warranted a `refactor:` commit.

## Sprint 5 follow-ups (sweep findings)

Cataloged read-only; DO NOT assume any of these are scheduled. They
are priority-ranked for future sprint planning.

### Medium priority

- **`TabBar.tsx:62` — close button `×` glyph has no `aria-label`.**
  Screen readers announce nothing for the per-tab close button. This
  is an accessibility gap rather than an i18n swap: add
  `aria-label={t("common.close")}` (new key) or similar.
- **`App.tsx:158` — Microsoft support URL hardcoded in
  `handleTrustHowTo`.** Already noted in Sprint 3/4 follow-ups as
  "TrustGuideDialog URL / docs reference review".

### Low priority

- **`StatusBar.tsx:30` — `"ID: "` prefix before the project ID
  slice.** User-visible but tiny; ambiguous whether it needs i18n
  (labels like "ID" often stay untranslated).
- **`StatusBar.tsx:37` — `"VBA"` language tag at bottom-right.**
  Ambiguous: `"VBA"` is a proper noun (the language name) and is
  generally not translated across locales. Flag for human review.
- **`WelcomeScreen.tsx:23` — `"Verde"` brand headline.** Brand/proper
  noun; conventionally not translated, but flagged for explicit
  product decision.

### Not i18n candidates (cataloged for completeness)

- `Sidebar.tsx:12–15` — emoji icons (`📄`, `🔷`, `🖼`, `📊`) keyed by
  `moduleTypeLabel`. Technical identifier mapping.
- `App.tsx:121` — `console.log("File dialog not available outside
  Tauri")`. Developer/debug, never user-visible in prod.
- `Editor.tsx:89` — `fontFamily: "'Cascadia Code', 'Consolas',
  monospace"`. CSS font stack; technical identifier.

## Sprint 3/4 follow-ups update

- ~~ConflictDialog i18n pass~~ — **closed (already complete prior to
  Sprint 5; no changes needed)**.
- ~~"Excel Macro" file-dialog filter~~ — **closed (Sprint 5, commit
  `2bd8fd4`)**.
- ~~Loading-flag asymmetry~~ — already closed in Sprint 4.
- ~~`saveBlockedPrompt` / `excelOpenPrompt` hardcoded English~~ —
  already closed in Sprint 4.
- **`TrustGuideDialog` URL / docs reference review** — still
  outstanding.
- **`handleCloseModule` `null!` narrowing** — still outstanding.
- ~~**`checkConflict` silent failure path**~~ — closed in Sprint 6
  (commit `fix(hooks): warn on checkConflict silent failure`).
- **Optional: `withLoadingState` helper** — still outstanding.

# Sprint 6 — A11y on TabBar close button and checkConflict visibility

## Goal

Close two small-scope follow-ups carried from Sprint 3–5: surface the
per-tab close button to screen readers with a translated accessible
name, and stop hiding a real `checkConflict` regression behind the
macOS / no-Excel swallow.

## Scope

- **A-stream**: add `aria-label={t("common.close")}` to the TabBar
  per-tab close button (glyph-only `×` has no accessible name). Add
  the new `common.close` locale key in en/ja.
- **B-stream**: convert the silent `checkConflict` catch in `runOpen`
  into a `console.warn` that preserves the swallow invariant
  (platform-missing fallback still opens the file) while tagging the
  failure for devtools inspection.
- Preserve Kent Beck TDD / Tidy First discipline — every behavior
  change starts from a failing test.

## Changes landed (all on `main`, not pushed)

| Commit  | Type        | Summary                                                                      |
| ------- | ----------- | ---------------------------------------------------------------------------- |
| (this)  | feat(ui)    | Add `aria-label` to TabBar close button + `common.close` locale key          |
| (this)  | test(ui)    | Characterize TabBar close-button accessible name wiring                      |
| (this)  | fix(hooks)  | Warn on checkConflict silent failure while preserving the swallow invariant  |
| (this)  | test(hooks) | Characterize `console.warn` + `state.conflict === null` under check failure  |
| (this)  | docs        | Record Sprint 6 plan and outcomes                                            |

## Acceptance criteria (verified)

- `bun run test` — all green (final count: **29** tests across 5 files)
- `bun run tsc --noEmit` — clean (exit 0)
- `cargo` — untouched (no Rust changes in Sprint 6)

## Key decisions

- **`common.close` chosen over reusing `common.dismiss`**: semantically
  distinct — `dismiss` is "revoke/suppress a prompt" (Banner), `close`
  is "close this surface" (tab, future dialog close icon). The ja
  translations happen to collide on "閉じる" today but the English
  split keeps the i18n surface honest for future per-locale drift.
- **`ja.common.dismiss` deliberately left at "閉じる"**: changing the
  live user-visible string while adding a new key would have been a
  scope creep into UX wording. Any re-word is a separate decision.
- **`type="button"` added alongside `aria-label`**: the close button
  lives inside a clickable tab `<div>`, and a bare `<button>` defaults
  to `type="submit"` which would break anyone who later wraps TabBar
  in a form. The two attrs landed together as a single a11y hardening.
- **`console.warn` over `throw` for `checkConflict`**: throwing would
  regress the macOS / no-Excel fallback that `runOpen` deliberately
  preserves. The warn keeps the swallow invariant AND makes a real
  regression observable in devtools — this is the minimum-viable
  "stop hiding" step. A structured logger / user-facing toast is a
  future option if the signal proves noisy.
- **Sprint 6 pairs two independent minimal-risk items**: neither item
  was large enough for its own sprint, and the TDD shapes differ
  (RTL accessible-name assertion vs `vi.spyOn(console, "warn")`), so
  one failing does not block the other. This is the "bundle small
  independents" pattern worth repeating when the backlog is all
  follow-ups of similar size.

## Follow-ups (out of Sprint 6 scope)

- **`TrustGuideDialog` URL / docs reference review** — still
  outstanding from Sprint 3/4/5.
- **`handleCloseModule` `null!` narrowing** — still outstanding from
  Sprint 3/4/5.
- **Sprint 5 sweep — Low priority items** (`StatusBar.tsx` `"ID: "`
  prefix, `"VBA"` language tag, `WelcomeScreen.tsx` `"Verde"` brand
  headline) — still outstanding; each needs a product decision rather
  than a mechanical swap.
- **Optional: `withLoadingState` helper** — still outstanding from
  Sprint 4.
- **Structured logging for `checkConflict`**: if the warn proves
  noisy (e.g. every macOS open logs it), replace with a gated
  debug-channel log or surface once per session. Not a candidate
  until telemetry shows the noise.

# Sprint 7 — `setActiveModule` signature honesty

## Goal

Replace the `null!` force-cast at `App.tsx` `handleCloseModule` with
a signature-level fix: widen `useVerdeProject.setActiveModule` to
accept `ModuleInfo | null` so the contract matches the actual
runtime behavior, and remove the non-null assertion that was only
there to appease the narrower type.

## Scope

- **A-stream**: widen `setActiveModule` signature from
  `(module: ModuleInfo)` to `(module: ModuleInfo | null)` — pure
  structural change, no runtime diff (`setState` already stores
  `null` transparently).
- **B-stream**: pin the widened contract with a hook-level
  characterization test that exercises both `setActiveModule(mod)`
  and `setActiveModule(null)` transitions.
- **C-stream**: drop the `null!` assertion in `App.tsx:189` —
  `?? null` is now type-correct.
- Preserve Kent Beck TDD / Tidy First discipline: the RED phase was
  the pre-widening `tsc --noEmit` failure when the test was drafted;
  committed history lands the signature widening first so every HEAD
  stays green.

## Changes landed (all on `main`, not pushed)

| Commit  | Type          | Summary                                                                     |
| ------- | ------------- | --------------------------------------------------------------------------- |
| 71cf499 | refactor(hooks) | Widen `setActiveModule` signature to accept `ModuleInfo \| null`          |
| 08c1670 | test(hooks)   | Characterize `setActiveModule(null)` clears active module                   |
| 2e31204 | refactor(ui)  | Drop `null!` force-cast from `handleCloseModule`                            |
| (this)  | docs          | Record Sprint 7 plan and outcomes                                           |

## Acceptance criteria (verified)

- `bun run test` — all green (final count: **30** tests across 5 files)
- `bun run tsc --noEmit` — clean (exit 0)
- `cargo` — untouched (no Rust changes in Sprint 7)

## Key decisions

- **Signature widening first, test second, Tidy third**: the
  narrative TDD order is "write test (RED: tsc fails) → widen
  (GREEN) → tidy". But the first landed commit is the signature
  widening so that every HEAD is clean — the test then lands on top
  of an already-widened contract, and the App-side Tidy lands last.
  This preserves bisect-ability at the cost of one bit of TDD
  narrative (captured here).
- **`null!` was a type-system bypass, not a runtime guard**: the
  non-null assertion on the `null` literal lets TypeScript treat the
  expression as `never`, which is assignable to any type. That is
  *exactly* the "paper over the signature" antipattern the sprint
  targets. Removing the `!` without widening would have introduced a
  type error; widening without removing the `!` would have left the
  marker in place as dead weight for future readers.
- **Test pins both transitions, not just null**: asserting only
  `setActiveModule(null) → activeModule === null` would leave open
  whether the reducer handles the round-trip correctly. Flipping to
  a real `ModuleInfo` first and then back to null proves the reducer
  honors both directions via the same code path.
- **No `setActiveModule(null)` call site adopted yet**: the widened
  signature enables, but does not require, replacing the
  `?? null!`-style dance anywhere else. The codebase only had one
  such site (`handleCloseModule`); if a future feature needs to
  clear the active module without going through the close flow, the
  contract now supports it cleanly.
- **Sprint 7 was intentionally single-item**: four Sprint 6
  follow-ups remained, but three of them (`TrustGuideDialog` URL,
  `withLoadingState` helper, structured `checkConflict` logging)
  were blocked on external input (product decision / telemetry) or
  explicitly rejected in prior sprints. Bundling only for the sake
  of filling a sprint would have forced scope creep; landing one
  clean follow-up keeps velocity honest.

## Follow-ups (out of Sprint 7 scope)

- **`TrustGuideDialog` URL / docs reference review** — still
  outstanding; blocked on Verde-owned docs page decision.
- **Sprint 5 sweep — Low priority items** (`StatusBar.tsx` `"ID: "`
  prefix, `"VBA"` language tag, `WelcomeScreen.tsx` `"Verde"` brand
  headline) — still outstanding; each needs a product decision.
- **Optional: `withLoadingState` helper** — still outstanding;
  Sprint 4 rejected it pending rule-of-three evidence beyond the
  current three mutation hooks.
- **Structured logging for `checkConflict`** — still outstanding;
  Sprint 6 gated on telemetry.

# Sprint 8 — `SAVE_BLOCKED_READONLY` sentinel characterization

## Goal

Close the characterization gap around the `SAVE_BLOCKED_READONLY`
sentinel: an exact-string contract declared in `useVerdeProject.ts`
and consumed in `App.tsx`, with a comment explicitly calling out
"changing the value is a coordinated UI change" — yet zero tests
pinned either side of the coupling before this sprint.

## Scope

- **Sole item**: add one hook-level characterization test that pins
  three invariants on a read-only save attempt:
  1. the throw is an `Error` instance (not a bare string)
  2. `e.message` is exactly `"SAVE_BLOCKED_READONLY"`
  3. the short-circuit fires *before* any backend invoke
- Also pin the sentinel literal itself so a rename of the constant
  without a coordinated `App.tsx` update fails this test.
- Intentionally **no** production-code changes. Sprint 8 is a
  regression-gate installation, not a behavior change.
- Out of scope for this sprint: an App-side (UI-consumer) test
  that walks the saveBlocked banner render path. That needs the
  openProjectReadOnly flow stubbed through App's dynamic-import
  chain, which is a wider test scaffold than a single sprint item.

## Changes landed (all on `main`, not pushed)

| Commit  | Type        | Summary                                                                       |
| ------- | ----------- | ----------------------------------------------------------------------------- |
| 77f3259 | test(hooks) | Pin SAVE_BLOCKED_READONLY sentinel contract across read-only save attempts   |
| (this)  | docs        | Record Sprint 8 plan and outcomes                                             |

## Acceptance criteria (verified)

- `bun run test` — all green (final count: **31** tests across 5 files)
- `bun run tsc --noEmit` — clean (exit 0)
- `cargo` — untouched (no Rust changes in Sprint 8)

## Key decisions

- **Hook side pinned, UI side deferred**: the throw end of the
  contract is 1 short-circuit in 1 function; the consumer end lives
  inside App.tsx's catch-site routing with a three-layer dialog/
  banner fallback. Pinning the thrower first catches the majority of
  drift risk (the constant moves, the wrapper disappears) with one
  compact test; the consumer side can come later as a wider App
  integration test when the scaffolding justifies it.
- **Four assertions over one**: the test could have stopped at
  `rejects.toThrowError(new Error(SAVE_BLOCKED_READONLY))` but that
  alone does not catch a regression where the guard moves below the
  backend invoke (side-effect executed, then throw). Checking
  `invokeMock.mock.calls.length` before/after the save isolates that
  invariant. Pinning the literal itself (`expect(SAVE_BLOCKED_READONLY).toBe("SAVE_BLOCKED_READONLY")`)
  catches constant-rename drift even when the thrower-side plumbing
  stays correct.
- **Discovered coupling fault during writing**: the test initially
  used `"open_project_read_only"` in the mock dispatch, but the
  actual Tauri command name is `open_project_readonly` (no
  underscore between `read` and `only`). The mismatch was caught
  because the test exercises the real `tauri-commands.ts` wrapper,
  not a stubbed hook. Finding this via a RED that was not
  about-the-sentinel is exactly the kind of side benefit a
  characterization test delivers — and a good argument for why the
  probe-then-test discipline should not skip the test-run step.
- **Sprint 8 was intentionally single-item, again**: the remaining
  Sprint 6/7 follow-ups are either blocked on external input
  (product / telemetry) or are test-file Tidies worth less than
  closing a real contract gap. One focused characterization beats
  several mechanical swaps.

## Follow-ups (out of Sprint 8 scope)

- ~~**App.tsx consumer-side test for the saveBlocked banner path**~~
  — closed in Sprint 9 (commit `fc276f8`).
- **Residual `key!` force-cast in `error-parse.test.ts:174`** —
  narrow the `key: string | undefined` via an explicit guard so the
  test file stops carrying the same "paper over the signature"
  antipattern Sprint 7 removed from the hook. Tiny Tidy candidate.
- **`TrustGuideDialog` URL / docs reference review** — still
  outstanding; blocked on Verde-owned docs page decision.
- **Sprint 5 sweep — Low priority items** (`StatusBar.tsx` `"ID: "`
  prefix, `"VBA"` language tag, `WelcomeScreen.tsx` `"Verde"` brand
  headline) — still outstanding; each needs a product decision.
- **Optional: `withLoadingState` helper** — still outstanding;
  Sprint 4 rejected it pending rule-of-three evidence.
- **Structured logging for `checkConflict`** — still outstanding;
  Sprint 6 gated on telemetry.

# Sprint 9 — App-side saveBlocked banner consumer characterization

## Goal

Close the Sprint 8 follow-up by pinning the App-side consumer of the
`SAVE_BLOCKED_READONLY` sentinel. Sprint 8 pinned the hook throw
(Error instance, exact message, short-circuit before invoke); this
sprint adds the diagonal: App's `handleSave` catch-site matches the
exact message, translates it, and renders the saveBlocked Banner —
without leaking the raw sentinel into the DOM and without bypassing
the hook to call `save_module` directly.

## Scope

- **Sole item**: add one App-level characterization test that walks
  the full consumer path (Open .xlsm → LOCKED → LockDialog →
  "Open Read-Only" → Editor stub save trigger → saveBlocked Banner).
- Three invariants land in one test:
  1. Banner body equals `en.json → status.saveBlocked`
  2. The `SAVE_BLOCKED_READONLY` literal never reaches the DOM
  3. `save_module` is never dispatched through the `invoke` mock
- Intentionally **no** production-code changes. Sprint 9 is a
  regression-gate install only.
- The test reuses the existing Editor stub, `@tauri-apps/plugin-dialog`
  mock, and `initI18n("en")` scaffold from `App.test.tsx`. No new
  test infrastructure introduced.

## Changes landed (all on `main`, not pushed)

| Commit  | Type     | Summary                                                                     |
| ------- | -------- | --------------------------------------------------------------------------- |
| fc276f8 | test(ui) | Pin saveBlocked banner render path for SAVE_BLOCKED_READONLY consumer side |
| (this)  | docs     | Record Sprint 9 plan and outcomes                                           |

## Acceptance criteria (verified)

- `bun run test` — all green (final count: **32** tests across 5 files)
- `bun run tsc --noEmit` — clean (exit 0)
- `cargo` — untouched (no Rust changes in Sprint 9)

## Key decisions

- **Three invariants in one test, not three tests**: the flow prelude
  (dialog → LOCKED → LockDialog → Open Read-Only → save trigger) is
  five fireEvent/findBy calls. Splitting one assertion per test would
  have triplicated the prelude for ~3× the slow-test cost without
  improving failure localization — each invariant's assertion message
  already names the specific gate it guards.
- **`invoke` bypass-check (invariant 3) is diagonal, not redundant**:
  the hook-side Sprint 8 pin already asserts `save_module` is not
  called. Re-asserting here catches a *different* regression:
  "someone added a `tauri-commands.saveModule(...)` call in App that
  bypasses the hook entirely." That path is invisible to the hook
  test because the hook wouldn't even run.
- **LOCKED-forced open is the only route to readonly state**: App
  exposes `openProjectReadOnly` exclusively via the LockDialog's
  "Open Read-Only" button. Going through the lock flow is not test
  awkwardness — it's the real product path users take. The scaffold
  doubles as an implicit lock-dialog-to-readonly smoke test.
- **`findByRole("alert")` is unambiguous**: the readOnly status strip
  uses `role="status"`, the Banner uses `role="alert"`, and no other
  alert surfaces are active in this flow. Probing Banner.tsx
  (probe 3/3) confirmed the role attribute before writing the
  selector, avoiding a guesswork-driven false positive.
- **Negative assertion on the sentinel literal (invariant 2) is
  tight**: `not.toHaveTextContent("SAVE_BLOCKED_READONLY")` fails if
  a future change ever routes the Error's `.message` to the DOM
  (e.g. via `setErrorBanner({ kind: "generic", message: e.message })`
  bypassing the sentinel check). The guard is cheap and catches a
  class of regressions that the positive text assertion alone would
  miss (the banner could show BOTH texts).

## Follow-ups (out of Sprint 9 scope)

- ~~**Residual `key!` force-cast in `error-parse.test.ts:174`**~~ —
  closed in Sprint 10 (commit `dcdac42`).
- **`TrustGuideDialog` URL / docs reference review** — still
  outstanding; blocked on Verde-owned docs page decision.
- **Sprint 5 sweep — Low priority items** (`StatusBar.tsx` `"ID: "`
  prefix, `"VBA"` language tag, `WelcomeScreen.tsx` `"Verde"` brand
  headline) — still outstanding; each needs a product decision.
- **Optional: `withLoadingState` helper** — still outstanding;
  Sprint 4 rejected it pending rule-of-three evidence.
- **Structured logging for `checkConflict`** — still outstanding;
  Sprint 6 gated on telemetry.

# Sprint 10 — Residual `key!` force-cast Tidy in error-parse.test

## Goal

Close the Sprint 8 follow-up by removing the residual non-null
assertion (`key!`) in `src/lib/error-parse.test.ts:174`. Same
antipattern Sprint 7 struck from `handleCloseModule`: the `!`
bypasses TypeScript's type system without providing any runtime
guarantee, since the `toBeDefined()` expect-assertion that
precedes it is a test-framework check, not a type narrowing.

## Scope

- **Sole item**: insert an explicit `if (key === undefined) continue;`
  narrowing guard directly after the `toBeDefined()` assertion in
  the `toI18nKey locale contract` test, and drop the `!` on the
  subsequent `resolve(locale, key!)` call.
- No production-code changes. Sprint 10 is a test-file Tidy that
  eliminates a type-system bypass — structural improvement only.

## Changes landed (all on `main`, not pushed)

| Commit  | Type | Summary                                                  |
| ------- | ---- | -------------------------------------------------------- |
| dcdac42 | test | Narrow `key` type guard in `error-parse.test` (drop `!`) |
| (this)  | docs | Record Sprint 10 plan and outcomes                       |

## Acceptance criteria (verified)

- `bun run test` — all green (final count: **32** tests across 5 files)
- `bun run tsc --noEmit` — clean (exit 0)
- `cargo` — untouched (no Rust changes in Sprint 10)

## Key decisions

- **`continue` over `throw` or early-`return`**: the `toBeDefined()`
  line above already emits the test failure if `key` is undefined;
  a subsequent `throw` would double-report the same regression, and
  an early `return` would break out of the surrounding `for...of`
  over `samples` rather than skipping the individual iteration. A
  plain `continue` signals "this iteration is already failed by the
  prior assertion, don't spam further expectations" while preserving
  fan-out across remaining sample inputs.
- **Guard immediately after `toBeDefined()`, not inside the locale
  loop**: placing it at the sample-iteration boundary narrows `key`
  for the entire inner locale loop in a single statement, avoiding
  a repeated guard on each branch of `if (expectsTitleMessage)`.
- **`toBeDefined()` kept alongside the narrowing guard**: removing
  the expect-assertion would hide regressions where `toI18nKey`
  starts returning `undefined` for an input that was previously
  structured — the assertion is the *signal*, the guard is the
  *type-system bridge*. Both are load-bearing.
- **Parallel to Sprint 7's `null!` removal**: Sprint 7 widened the
  `setActiveModule` signature to eliminate a production-side `null!`;
  Sprint 10 adds a narrowing guard in test code to eliminate a
  test-side `key!`. Same underlying pattern (type-system bypass),
  different surface — and the test-side fix doesn't need a signature
  widening because `toI18nKey`'s return type is already correct; the
  test just needed to *respect* it.
- **Sprint 10 intentionally single-item, again**: continues the
  Sprint 7/8/9 cadence of closing one follow-up per sprint when the
  remaining backlog is either blocked on external input
  (TrustGuideDialog docs page, low-priority product decisions) or
  explicitly rejected pending future evidence (`withLoadingState`,
  structured `checkConflict` logging).

## Follow-ups (out of Sprint 10 scope)

- **`TrustGuideDialog` URL / docs reference review** — still
  outstanding; blocked on Verde-owned docs page decision.
- **Sprint 5 sweep — Low priority items** (`StatusBar.tsx` `"ID: "`
  prefix, `"VBA"` language tag, `WelcomeScreen.tsx` `"Verde"` brand
  headline) — still outstanding; each needs a product decision.
- **Optional: `withLoadingState` helper** — still outstanding;
  Sprint 4 rejected it pending rule-of-three evidence.
- **Structured logging for `checkConflict`** — still outstanding;
  Sprint 6 gated on telemetry.

# Sprint 11 — Residual `path as string` cast Tidy in handleOpenFile

## Goal

Extend the Sprint 7 / 10 "type-system bypass removal" pattern to
the last remaining instance under `src/`: the
`const xlsmPath = path as string;` assertion at
`App.tsx:113` inside `handleOpenFile`. Tauri v2 plugin-dialog's
`open<T>()` already returns `string | null` for our option shape,
and the `if (!path) return;` guard immediately above narrows it —
so the assertion is redundant dead weight rather than a guard.

## Scope

- **Sole item**: drop the `as string` cast from `handleOpenFile`,
  inlining `path` directly into the `openProject(path)` and
  `handleCaughtBackendError(e, path)` call sites. Removes the
  intermediate `xlsmPath` local since it existed only to carry the
  cast.
- No new test: existing `App.test.tsx` suite already exercises the
  full `handleOpenFile` path (dialog open → openProject dispatch →
  catch-site routing), so the cast removal is covered by the
  current characterization suite. Adding a typing-only test would
  be redundant with `tsc --noEmit`.

## Changes landed (all on `main`, not pushed)

| Commit  | Type         | Summary                                                   |
| ------- | ------------ | --------------------------------------------------------- |
| d024997 | refactor(ui) | Drop redundant `path as string` cast in `handleOpenFile`  |
| (this)  | docs         | Record Sprint 11 plan and outcomes                        |

## Acceptance criteria (verified)

- `bun run test` — all green (final count: **32** tests across 5 files)
- `bun run tsc --noEmit` — clean (exit 0)
- `cargo` — untouched (no Rust changes in Sprint 11)

## Key decisions

- **Conditional-type inference proves the cast redundant**:
  `plugin-dialog`'s `OpenDialogReturn<T>` is
  `T['directory'] extends true ? ... : T['multiple'] extends true ? string[] | null : string | null`.
  Our options object (`{ filters: [...] }`) leaves both `directory`
  and `multiple` unset — neither extends `true` — so the inferred
  return is `string | null`. The `if (!path) return;` guard narrows
  the `null` branch away, leaving `string` without any assertion.
  Probing the `.d.ts` before editing was load-bearing: it confirmed
  the cast was not papering over a genuine union-widening hazard.
- **Production change, not test-only**: the sprint brief preferred
  test-only changes, but the only remaining type-system bypass
  worth picking lived in production code (`App.tsx:113`). Declining
  it in favor of a manufactured test-side Tidy would have burned a
  sprint on the lower-value target. The production risk is minimal:
  the cast is load-bearing only to TypeScript, not to the runtime
  (it's a no-op after compile), and the existing test suite fully
  covers the call paths that use the variable.
- **`xlsmPath` local eliminated rather than preserved**: with the
  cast gone, the intermediate `const xlsmPath = path;` would be
  pure rename noise. Inlining `path` into the two consuming calls
  is tighter and matches how `handleForceOpen`/`handleOpenReadOnly`
  destructure `const { xlsmPath } = lockPrompt;` directly without
  an intermediary — the naming asymmetry is gone as a side effect.
- **No new characterization test added**: TypeScript's conditional-
  type inference is compile-time, so the regression surface is
  `tsc --noEmit`, not `vitest`. The existing App-level flow tests
  (Sprint 9's saveBlocked path and Sprint 3's `projectNotFound`
  banner render) already dispatch through `handleOpenFile`, so a
  typo or regression in the `openProject(path)` wiring would fail
  those. Adding a typing-check test would duplicate `tsc`'s job.
- **Closes the "type-system bypass" theme for src/**: Sprints 7 /
  10 / 11 form a coherent arc — production `null!` → test `key!` →
  production `as string`. A post-sprint `grep` confirms no further
  non-null assertions or redundant type casts remain in `src/**`
  production or test code. The pattern is retired for this
  codebase until new ones accrete.

## Follow-ups (out of Sprint 11 scope)

- **`TrustGuideDialog` URL / docs reference review** — still
  outstanding; blocked on Verde-owned docs page decision.
- **Sprint 5 sweep — Low priority items** (`StatusBar.tsx` `"ID: "`
  prefix, `"VBA"` language tag, `WelcomeScreen.tsx` `"Verde"` brand
  headline) — still outstanding; each needs a product decision.
- **Optional: `withLoadingState` helper** — still outstanding;
  Sprint 4 rejected it pending rule-of-three evidence.
- **Structured logging for `checkConflict`** — still outstanding;
  Sprint 6 gated on telemetry.
- **All four remaining follow-ups are external-input-gated**:
  product decisions (TrustGuideDialog URL, low-priority i18n
  sweep), telemetry evidence (`checkConflict` noise), or
  rule-of-three accumulation (`withLoadingState`). Sprint 12 will
  likely need fresh input from the sweep or a new PBI rather than
  another follow-up pickup.

# Sprint 12 — Backlog refinement only, candidates enumerated for future sprints

## Goal

Sprints 7 / 10 / 11 closed the "type-system bypass" arc. All four
remaining Sprint 11 follow-ups are external-input-gated (product
decisions, telemetry evidence, rule-of-three accumulation). This
sprint is a pure refinement pass: enumerate non-bypass Tidy
candidates surfaced by a fresh `src/**` sweep, rank them by
priority and readiness, and explicitly decline to execute any —
each candidate either lacks a decisive rule-of-three signal, falls
below the "cosmetic vs load-bearing" threshold, or exceeds a single
sprint's safe scope.

## Scope

- **Sole item**: `src/**` spot-check with `rg` for dead code,
  duplicated structure, inconsistent naming, long functions,
  residual debug logs, and stale TODO markers — excluding the
  already-closed type-system bypass theme.
- Record the top-three candidates below with explicit "why not
  now" notes.
- **No code changes**, **no sprint tag** — pure backlog hygiene
  commit so Sprint 13 planning starts from a refreshed candidate
  pool rather than a cold re-probe.

## Sweep findings (spot-check, not exhaustive)

Probes executed:
- `rg "TODO|FIXME|HACK|XXX|console\.(log|debug|info)"` across
  `src/**/*.{ts,tsx}`
- File-size ordering (`wc -l`) to surface long-function suspects
- `rg "export (function|const|class|interface|type)"` for
  dead-export / unused-symbol suspects
- Targeted read of `App.tsx:145-216` (handler cluster) and
  `src/components/ConflictDialog.tsx:11-19` (prop surface)

Residuals observed:
- `App.tsx:120` — `console.log("File dialog not available outside Tauri")`
  dev-mode fallback. Already cataloged in Sprint 5 sweep as
  non-i18n / non-user-visible. **Not a Tidy**: intentional
  dev-only signal, removing it would regress local-dev
  discoverability.
- `App.tsx:155`, `App.tsx:211` — two `// TODO` markers. Both flag
  genuine future work (Verde docs URL, ConflictDialog wiring for
  content conflicts). **Not stale**: TODO removal would lose
  load-bearing context.

## Sprint 12 candidate catalogue (priority-ranked, not scheduled)

### Candidate A (Small, Low priority) — `handleKeepFile` / `"verde"` naming asymmetry

- **Where**: `App.tsx:163-169`, `ConflictDialog.tsx:11-19`.
- **Shape**: the dialog prop is `onKeepFile`, the App callback is
  `handleKeepFile`, but the underlying `resolveConflict("verde")`
  arg uses the "verde" metaphor. Two vocabularies — "file"
  (user-facing: "the version in my file") and "verde" (internal:
  "the verde-side cache") — coexist without an explicit mapping.
- **Why not now**: the App↔Dialog naming pair IS self-consistent
  (both sides use `File`/`Excel`); the "verde" vs "file" gap lives
  one layer deeper at the hook boundary and is load-bearing there
  (the hook needs to distinguish verde-side vs excel-side state,
  not user-file-side). A rename would need a product decision on
  which vocabulary is canonical — that is external input, not a
  mechanical Tidy. Defer until a UX / docs pass clarifies the
  canonical label.

### Candidate B (Small, Low priority) — `openModules` filename-filter helper extraction

- **Where**: `App.tsx:174` (`openModules.find((m) => m.filename === mod.filename)`)
  and `App.tsx:185-187`
  (`openModules.filter((m) => m.filename !== mod.filename)`).
- **Shape**: two uses of the same "match module by filename"
  predicate. A `byFilename(mod)` or `sameFilename(a,b)` helper
  would collapse both to a single named predicate.
- **Why not now**: rule-of-two, not three. Sprint 4 explicitly
  retired a similar `withLoadingState` helper candidate at two
  uses and required rule-of-three evidence before reviving it.
  Same discipline applies: extract once a third call site appears
  (e.g. a future "focus-next-tab-by-filename" handler), not before.

### Candidate C (Medium, Medium priority) — `App.tsx` (352 LOC) responsibility split

- **Where**: `src/App.tsx` as a whole.
- **Shape**: the file fuses three clusters — error routing
  (`routeParsedError`, `handleCaughtBackendError`), open-flow
  handlers (`handleOpenFile`, `handleForceOpen`,
  `handleOpenReadOnly`), and UI render (JSX tree with seven
  component children). Extraction candidates: a `useErrorRouting`
  hook returning `{ errorBanner, saveBlockedPrompt,
  excelOpenPrompt, routeParsedError, handleCaughtBackendError,
  clearBanners }`, or a `handlers.ts` module for the open-flow
  trio.
- **Why not now**: two reasons. (1) The extraction boundary is
  not obvious — `handleCaughtBackendError` reads `setLockPrompt`
  (open-flow state) AND `routeParsedError` (error-routing state),
  so the hook extraction forces a choice between "passing
  setLockPrompt in" (leaky) or "co-locating lock state with
  error state" (drift risk). (2) The test suite's
  characterization coverage (32 tests) is indexed against the
  current module layout; a split demands either test-helper
  refactoring or temporary coverage gaps. Neither is a single-
  sprint safe move. Revisit when either (a) a new feature forces
  the boundary (e.g. a second error-routing consumer), or (b) a
  dedicated restructure PBI gets planned with explicit test-
  refactor scope.

## Decision

**Sprint 12 is refinement-only.** No code change, no sprint tag.
Sprint 13 planning should re-examine the candidate catalogue
above against any new context (product feedback, new PBI, test
coverage changes) before spending execution budget.

## Acceptance criteria (verified)

- `bun run test` — still green (unchanged: **32** tests across 5 files)
- `bun run tsc --noEmit` — still clean (exit 0; untouched)
- `cargo` — untouched (no Rust changes in Sprint 12)

## Key decisions

- **Backlog refinement is a legitimate sprint outcome**: forcing
  an execution when the candidate pool is all "cosmetic / too
  large / rule-of-two" burns trust in the prioritization process.
  A clean refinement commit lands less code than an execution
  commit but leaves Sprint 13 with a warm catalogue instead of a
  cold re-probe.
- **No sprint tag without behavior change**: tags mark
  executable milestones (for bisect / revert). A refinement-only
  sprint has nothing to bisect to; the docs commit hash itself is
  the reference point.
- **Explicit "why not now" per candidate**: enumerating without
  justifying defers decisions to a future planner who has less
  context than today. The three "why not now" notes encode the
  priority ordering in a durable form so Sprint 13 doesn't need
  to re-derive them.
- **Rule-of-three discipline honored on Candidate B**: same gate
  Sprint 4 applied to `withLoadingState`. Consistency is itself a
  form of backlog hygiene — if candidate B is scheduled at two
  uses, the `withLoadingState` deferral loses credibility.

## Follow-ups (out of Sprint 12 scope)

- All four Sprint 11 follow-ups remain unchanged (external-input-
  gated).
- Sprint 12 candidates A/B/C above are now part of the residual
  backlog with their "why not now" rationale attached.

# Sprint 13 — Catalogue re-evaluation, no situation change

## Goal

Re-evaluate the Sprint 12 candidate catalogue (A / B / C) and the
four external-input-gated follow-ups after one sprint's elapsed time.
Explicitly confirm no situation change has promoted any candidate to
"ready for execution" and record the re-evaluation in plan.md so
Sprint 14 starts from a refreshed (not re-probed) backlog.

## Scope

- **Sole item**: re-scan `src/**` for the Candidate B signal — a
  third `openModules` call site using a "match by filename" predicate
  (the rule-of-three trigger Sprint 12 gated it on).
- Confirm Candidates A and C retain their "why not now" rationale
  (no new feature work, no product decision landed, no new consumer
  forcing a boundary).
- Confirm all four follow-ups remain external-input-gated.
- **No code change**, **no sprint tag** — refinement-only, same
  shape as Sprint 12.

## Re-scan findings

Probe executed:
- `rg "openModules\.(find|filter|some|every|map|reduce)"` across
  `src/**/*.{ts,tsx}` (and a broader `rg "openModules"` for context).

Results (3 occurrences of `openModules.<iterator>`, matching the
Sprint 12 probe outcome):

| Location         | Expression                                                    | Pattern        | Counts toward B? |
| ---------------- | ------------------------------------------------------------- | -------------- | ---------------- |
| `App.tsx:174`    | `openModules.find((m) => m.filename === mod.filename)`        | filename-match | **yes**          |
| `App.tsx:185`    | `openModules.filter((m) => m.filename !== mod.filename)`      | filename-match (negated) | **yes**  |
| `TabBar.tsx:32`  | `openModules.map((mod) => {...})`                             | enumeration    | **no**           |

`TabBar.tsx:32` is a list render, not a filename-predicate — it does
not apply a `m.filename === X` / `m.filename !== X` test. Counting it
toward B would dilute the rule-of-three into a rule-of-"any use of
the same variable", which Sprint 4's `withLoadingState` deferral
explicitly rejected.

**Candidate B signal**: still **rule-of-two**, unchanged from Sprint
12. Continues to defer.

## Candidate A / C re-evaluation

- **Candidate A** (`handleKeepFile` / `"verde"` naming asymmetry):
  still blocked on a product / docs decision about the canonical
  user-facing vocabulary (`"file"` vs `"verde"`). No product feedback
  or UX pass has landed since Sprint 12. Continues to defer.
- **Candidate C** (`App.tsx` 352 LOC responsibility split): no new
  feature has introduced a second error-routing consumer, and no
  restructure PBI has been planned with explicit test-refactor
  scope. The "test-helper refactor vs temporary coverage gap"
  tradeoff remains the same as Sprint 12. Continues to defer.

## Follow-ups re-evaluation (four external-input-gated items)

| Follow-up                                              | Gate                          | Status  |
| ------------------------------------------------------ | ----------------------------- | ------- |
| `TrustGuideDialog` URL / docs reference review         | Verde-owned docs page decision | deferred |
| Sprint 5 sweep low-priority i18n (`"ID: "`, `"VBA"`, `"Verde"`) | per-item product decisions | deferred |
| Optional `withLoadingState` helper                     | rule-of-three accumulation    | deferred |
| Structured logging for `checkConflict`                 | telemetry noise evidence      | deferred |

No external input (product decisions, telemetry, third call sites)
has surfaced in the one sprint since Sprint 12. All four remain
parked on their original gates.

## Decision

**Sprint 13 is refinement-only, no situation change.** One docs
commit records the re-evaluation; no sprint tag (same reasoning as
Sprint 12 — tags mark executable milestones for bisect, and a
re-evaluation has nothing to bisect to).

## Changes landed (all on `main`, not pushed)

| Commit | Type | Summary                                                   |
| ------ | ---- | --------------------------------------------------------- |
| (this) | docs | Record Sprint 13 catalogue re-evaluation (no changes)     |

## Acceptance criteria (verified)

- `bun run test` — still green (unchanged: **32** tests across 5 files)
- `bun run tsc --noEmit` — still clean (exit 0; untouched)
- `cargo` — untouched (no Rust changes in Sprint 13)

## Key decisions

- **Two consecutive refinement-only sprints is a signal, not a
  failure**: when the candidate pool is dominated by external-input-
  gated items and rule-of-three-pending candidates, manufacturing an
  execution burns trust in the prioritization discipline. Recording
  "no change" preserves the audit trail and makes it visible when an
  execution finally does land (Sprint 14+) that the gate genuinely
  opened rather than eroded.
- **`TabBar.tsx:32` explicitly excluded from Candidate B count**:
  the rule-of-three predicate is "same pattern, not same variable".
  A `.map` over `openModules` for list render is a categorically
  different operation from a `.find` / `.filter` with a filename
  equality predicate. Documenting this exclusion here prevents a
  future planner from miscounting the signal.
- **Re-scan executed even though the code was untouched**: 1
  sprint's elapsed time includes the possibility that unrelated
  feature work added a third call site. The probe is cheap (one
  `rg` invocation) and the cost of miscounting is a missed Tidy
  opportunity, so executing even when no interim work is expected
  is the cheaper risk posture.
- **No sprint tag, deliberately**: Sprint 12 set the precedent
  that refinement-only sprints skip the tag. Tagging a second
  no-change docs commit would muddy the `git tag` namespace without
  adding a meaningful reference point — `git log --oneline plan.md`
  already orders the refinements chronologically.

## Follow-ups (out of Sprint 13 scope)

- All four Sprint 11 follow-ups remain unchanged (external-input-
  gated).
- Sprint 12 candidates A / B / C remain unchanged (same "why not
  now" rationale).
- Sprint 14 should either (a) re-run the same re-evaluation probe
  if no new PBI lands, or (b) pick up a fresh PBI from product
  input if one arrives. A third consecutive refinement-only sprint
  is acceptable but would argue for a proactive product / PBI
  conversation rather than another silent re-scan.
