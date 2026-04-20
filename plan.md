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
- **`ConflictDialog` i18n parity**: dialog text has not yet been audited
  for the same localization pass that `routeParsedError` completed for
  banners.
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

- **`ConflictDialog` i18n pass** — still outstanding from Sprint 3.
- **`TrustGuideDialog` URL / docs reference review** — still pointing
  at a Microsoft support URL.
- **`handleCloseModule` `null!` narrowing** — widen the hook signature
  to accept `null` rather than force-casting.
- **`checkConflict` silent failure path** — at least a `console.warn`
  so a real regression doesn't hide behind the platform-missing case.
- **`"Excel Macro"` file-dialog filter string in `App.tsx`** — Sprint 4
  did NOT address this hardcoded English. Tiny candidate for a
  Sprint 5 i18n follow-up.
- **Optional: `withLoadingState` helper** — adopt only if the
  loading-flag shape proliferates beyond the current three mutation
  hooks.
