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

- **Loading-flag asymmetry**: `runOpen` toggles `loading` around its
  work; `saveModule` / `syncToExcel` / `resolveConflict` do not. Either
  they should, or the field should be renamed to reflect that it only
  tracks open flows. Pick one intentionally in a later sprint.
- **`saveBlockedPrompt` / `excelOpenPrompt` still carry hardcoded
  English** ("Dismiss", "Cannot save while Excel has the workbook
  open."). The errorBanner pulled these through `t(...)`; the two older
  prompts are the next natural i18n pass.
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
