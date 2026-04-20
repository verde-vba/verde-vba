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
