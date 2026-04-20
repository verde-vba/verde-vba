# Verde — Sprint History and Backlog (plan.md)

Compressed record of Sprints 3–17 plus consolidated follow-up backlog.

**Plan-bloat prevention policy (from Sprint 16):** at any time, only the
three most recent *decision-bearing* sprints are retained in full detail.
All earlier sprints collapse to one-line rows in the index table below —
`git log` + sprint tags are the authoritative source for their
commit-level detail. Compression-only sprints (like Sprint 16 itself) do
not consume a detail slot, and probe-only refinement sprints occupy one
slot at whatever density their outcome requires (often < 50 lines).
Currently detailed: Sprint 18 / 19 / 20. A planner adding a new sprint
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
| 14     | Third consecutive refinement-only; escalation advisory to product               | Docs `951c55c` — no code change; `openModules` probe + `git log` re-run unchanged; **Sprint 15 planning must include proactive product / PBI conversation** (durable signal). |
| 15     | Type-bypass arc completion for `main.tsx` root lookup                           | `8e15c3d` guard root element lookup (non-null assertion removed); docs `22cd27c`. Arc closed for `src/**`; post-sprint probe (`\!\.`, `as\s+[A-Z]`) added to Sprint 16+ checklist. |

Sprint 5 sweep non-i18n catalogue (technical identifiers, not localization targets — future sweeps should skip): `Sidebar.tsx:12–15` emoji icons; `App.tsx:121` dev console.log; `Editor.tsx:89` CSS font stack.

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

# Sprint 18 — Security hardening: 2 CRITICAL + 2 MEDIUM + 1 bonus

## Goal

Pause-breaking security sprint. Five cycles of refinement-only /
technical-exception work (Sprints 12–17) had fixated on frontend quality
and **never probed the external-I/O boundary** — specifically the
PowerShell bridge (`vba_bridge.rs`) and the MCP tool surface
(`mcp/server.js`). A stakeholder-initiated audit surfaced two CRITICAL
vulnerabilities plus two MEDIUM correctness issues, all in code that
the rule-of-three / type-bypass / i18n sweeps had structurally
sidestepped.

## Pause exit rationale

`plan.md:308` restart condition (c) — "新規 PBI が stakeholder から
明示的に投入される" — was met by the user explicitly directing the
planner to address the 4 findings. This is the designed exit, not a
planner-side re-interpretation of (a) or (b), both of which remain
unmet.

## Scope

- **PBI #1 (CRITICAL) — MCP path traversal.** `mcp/server.js` handlers
  composed `join(projectDir, args.module)` without validation. Prompt
  injection via workbook source could coerce an AI client into writing
  to `../../.../Startup/pwn.bat` via `write_module`, or deleting
  arbitrary files via `delete_module`. **Fix**: `safeModulePath`
  whitelist-regex + resolved-prefix containment check, routed through
  every handler.
- **PBI #2 (CRITICAL) — PowerShell injection in `vba_bridge.rs`.**
  `export` / `import` embedded `xlsm_path`, `output_dir`,
  `module_name`, `module_path` directly into a PS `-Command` script
  via `format!` with double-quoted string literals. A workbook whose
  `VB_Name` was `"; Start-Process calc.exe; #` would execute arbitrary
  PowerShell on first open. **Fix**: `validate_ps_arg` denylist
  (`"`, `` ` ``, `$`, `;`, newline, control chars), not
  `#[cfg(windows)]`-gated so darwin CI exercises the same surface.
- **PBI #3 (MEDIUM) — Lock wedge via Windows PID reuse.** `is_pid_alive`
  alone was unreliable for stale detection: a crashed Verde's PID,
  reassigned to Explorer/notepad, would report alive forever and wedge
  the lock. **Fix**: unified `LockManager::is_stale` decision table
  with a 7-day TTL fallback (conservative; long-running Verde sessions
  remain respected). **Bonus**: `Cargo.toml` was missing
  `Win32_System_Threading`, which `lock.rs:109` requires — a latent
  Windows-build break, caught while editing the lock path.
- **PBI #4 (MEDIUM) — `classify_import_error` locale fragility.** The
  EXCEL_OPEN substring list was English-only and invisible to grep;
  on Japanese Excel the "close and retry" dialog never fires. **Fix**:
  extract to named `EXCEL_OPEN_SUBSTRINGS` const with an explicit
  doc-comment on the limitation; extract `is_excel_open_error` as a
  pure predicate; pin each English substring AND the known Japanese
  miss with tests (the latter must be UPDATED not deleted when
  follow-up #17 lands).

## Changes landed (on `main`, not pushed)

| Commit  | Type                | Summary                                                       |
| ------- | ------------------- | ------------------------------------------------------------- |
| 32b8d5f | `fix(mcp)!`         | Path-traversal hardening (breaking: invalid module throws)    |
| 7c00520 | `fix(vba-bridge)`   | Reject PS-sensitive chars before `format!`                    |
| 084ee38 | `fix(lock)`         | TTL fallback for PID reuse + `Win32_System_Threading` feature |
| c875c58 | `refactor(project)` | Pin EXCEL_OPEN substrings + pin Japanese-locale miss          |
| e8064d2 | `chore(lock)`       | Drop dead `current_machine_name` helper post-`is_stale`       |
| (docs)  | `docs(plan)`        | This sprint section + Sprint 14 demotion + backlog updates    |

## Acceptance criteria (verified)

- `cargo test --lib` — **55 passed** (was 46); +9 vba_bridge, +5 lock,
  +4 project tests.
- `cargo clippy --lib -- -D warnings` — clean.
- `bun run test` (frontend) — **32 passed** (unchanged; no src/** touch).
- `bun run tsc --noEmit` — clean.
- `npx vitest run` (mcp) — **25 passed** (was 11); +14 path-traversal tests.

## Key decisions

- **Bundle all 4 as one sprint (option A)**: rejected the
  split-into-4-sprints path because (a) each PBI is narrowly scoped
  and independently committed, so `git blame` stays clean within each
  file; (b) batching the Pause-exit signal into one sprint preserves
  the "security hardening arc" as a single inspectable unit; (c) the
  plan-bloat policy budgets one detailed slot per sprint, and four
  separate sprints would have demoted real decision history
  unnecessarily.
- **PS validator is denylist, not allowlist, and explicitly MVP**:
  `validate_ps_arg` rejects `"`, `` ` ``, `$`, `;`, control chars. A
  strict allowlist would block legitimate Unicode paths (日本語
  filenames, etc.) the MVP should support. Follow-up #15 tracks the
  real fix: pass arguments via `-ArgumentList` + `param(...)` so the
  script body never concatenates caller data.
- **TTL threshold 7 days, not 24h**: the obvious failure mode of a
  too-aggressive TTL is silently reaping a legitimate long-running
  Verde session. 7 days is well past any realistic uninterrupted
  Verde session (daily laptop sleep/resume cycles, OS updates) while
  still bounding the PID-reuse wedge window.
- **EXCEL_OPEN Japanese-locale miss pinned as a negative assertion,
  not "TODO"**: a comment would rot. A red test is unavoidable
  feedback for anyone who tries to declare #17 done.
- **Validator placed above `#[cfg(windows)]` boundary**: darwin CI
  can run the same unit tests that gate the Windows COM path.
  Prevents a future planner from weakening the validator on a non-
  Windows workstation without seeing tests fail.
- **`Win32_System_Threading` fix bundled with PBI #3**: discovered
  while reading `lock.rs` for the TTL fix. Splitting it into a
  separate commit would have been ceremony; the commit message
  explicitly names the bonus fix so it's still searchable.

## Follow-ups registered (new backlog items)

- **#13**: ConflictDialog wiring for content-conflict reporting
  (promoted from Sprint 17's `App.tsx:211` TODO — unchanged).
- **#15**: Migrate `vba_bridge` to `-ArgumentList` / `param(...)`.
  Denylist is a mitigation, not a design; ideally caller data never
  reaches a `format!`-built script body.
- **#16**: Image-name-based lock staleness (`QueryFullProcessImage
  NameW` on Windows, `/proc/<pid>/comm` on Linux). Robust fix for
  PID reuse; TTL is a fallback.
- **#17**: HRESULT-based EXCEL_OPEN classification (locale-agnostic).
  When landed, flip the Japanese-locale pinned negative test to
  positive rather than deleting it.

## Advisory to Sprint 19 planner

Sprint 18 exited the Pause *and* delivered substantive fixes, but
re-entering Pause is the default unless another product signal
arrives. Three newly-surfaced follow-ups (#15, #16, #17) are all
design-weight items that deserve explicit Planning rather than
being absorbed into a silent refinement sprint. If the stakeholder
channel is quiet, prefer Pause over a Sprint-15-style
technical-exception pickup: **the exception does not generalize.**

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
| 13  | Alias of #12 (explicit registration during Sprint 18 security sweep)| S18         | Same as #12 — kept as a separate id only for planner cross-reference |
| 14  | (reserved — placeholder retired by Sprint 18 bundling decision)    | S18         | n/a                                               |
| 15  | Migrate `vba_bridge` to `-ArgumentList` / `param(...)`             | S18         | Re-architecture PBI (script body must not concatenate caller data) |
| 16  | Image-name-based lock staleness (Windows + Linux)                  | S18         | Windows COM/Win32 + Linux procfs expertise on hand |
| 17  | HRESULT-based EXCEL_OPEN classification (locale-agnostic)          | S18         | COM error-code extraction pathway (blocked on `vba_bridge` rewrite in #15) |

## Sprint 19 (2026-04-21) — App.tsx 責務分割

### Goal

App.tsx (352 LOC) をシングルオーナーな hook 群へ責務分割する。
frontend 32/32 test を safety net として TDD サイクルで各 extraction を実施。
behavioral change ゼロ — 構造変更のみ。

### 候補 split (3–5)

**C1 — `useErrorRouting` hook**
- 抽出対象: `routeParsedError`, `handleCaughtBackendError`, `errorBanner` state
- 境界: `ParsedError` → UI surface への dispatch logic。render tree への依存なし
- テスト軸: `routeParsedError` の exhaustive switch, `locked` drop, `excelOpen` / generic
  routing を hook-level で pin
- 優先度: **最高**。他 hook (`useOpenFile`, `useSave`) が `handleCaughtBackendError`
  を参照するため先行抽出が依存解消になる

**C2 — `useModuleTabs` hook**
- 抽出対象: `openModules` state, `handleSelectModule`, `handleCloseModule`
- 境界: "開いているタブ一覧 + アクティブモジュール遷移" の完結した state machine
- テスト軸: open/close/active-transition の各パスを hook-level unit test で pin
- 優先度: **高**。C1 と独立して抽出可能

**C3 — `useOpenFile` hook**
- 抽出対象: `lockPrompt` state, `excelOpenPrompt` state (部分),
  `handleOpenFile`, `handleForceOpen`, `handleOpenReadOnly`, `handleLockCancel`
- 境界: "Tauri dialog → project open → ロック競合 UI へ routing" の flow
- テスト軸: `handleForceOpen` の early-return (lockPrompt null), ロック競合 routing
- 優先度: **中**。C1 完了後に抽出 (`handleCaughtBackendError` を C1 から受け取る shape)

**C4 — `useSave` hook**
- 抽出対象: `saveBlockedPrompt` state, `handleSave`
- 境界: "saveModule → 成功/SAVE_BLOCKED_READONLY/backend error の 3-way dispatch"
- テスト軸: sentinel path (`SAVE_BLOCKED_READONLY`), success clear, error routing
- 優先度: **中**。C1 完了後に抽出

**C5 — ReadOnly WarningBar (optional component extraction)**
- 抽出対象: App.tsx:234–248 の `readOnly` banner JSX
- 境界: 単純な presentational strip。hook ではなく component 抽出
- テスト軸: `role="status"` render / non-render を snapshot で pin
- 優先度: **低**。C1–C4 完了後の仕上げとして検討。スコープ超過なら次 sprint に送る

### 実装順序

```
C1 (useErrorRouting) → C2 (useModuleTabs) 並行可
C3 (useOpenFile)     → C1 完了後
C4 (useSave)         → C1 完了後
C5                   → C1–C4 完了後、スコープ超過なら defer
```

各抽出ステップ: RED (hook contract test) → GREEN (抽出) → REFACTOR (App.tsx 整理)
commit 単位: 1 extraction = 1 commit (hook file + App.tsx diff + test)

### 受け入れ基準 (達成)

- `bun run test` 62/62 緑 (既存 32 → 新規 30 hook-level tests 追加)
- `bun run tsc --noEmit` クリーン
- App.tsx LOC: 352 → 229 (35% 削減; レンダーツリー合成に集中)
- `cargo test --lib` 55 緑 (backend 無変更確認)

### 変更コミット

| Commit  | 内容                                      |
| ------- | ----------------------------------------- |
| 072b44b | C1: `useErrorRouting` (+7 tests)          |
| 352d74c | C2: `useModuleTabs` (+7 tests; stale-closure fix) |
| 702e7fa | C3: `useOpenFile` (+9 tests)              |
| 19d7d5a | C4: `useSave` (+7 tests)                  |

C5 (ReadOnly WarningBar component) はスコープ超過のため defer。

## Intentional Pause — 終了記録 (exited 2026-04-21 by Sprint 18)

2026-04-21 に入った Pause は、同日内に再開条件 (c)（stakeholder 明示的
PBI 投入）により解除され、Sprint 18 として security 4 件に着地した。
本セクションは Pause 自体の解除履歴を durable signal として保存する
ためのもので、Sprint 19 以降で Pause を**再起動する場合**は新たな
"Intentional Pause (N)" セクションを下に追加すること。前回 Pause の
体裁を書き換えるのではなく、履歴として累積する。

**このPauseが機能した証拠**:

- Sprint 14 / 17 で蓄積された「silent refinement は product conversation
  のトリガーであるべき」という advisory が、明示的な Pause 指示に
  昇格した時点で stakeholder 側の行動を引き出した。
- stakeholder からの投入内容が過去の catalogued backlog
  （#1 / #8 / #9 等）ではなく、**どの probe set でも surface していなかった
  外部 I/O 境界の脆弱性**だった — 「probe-only refinement は
  新しい axis を見ない」という Sprint 17 の "orthogonal probe axis"
  洞察を、最も強い形で実証した。

**再発防止の教訓（次回 Pause 設計時に参照）**:

- Pause 中に planner 単独で実行できるのは依然として「新規 signal の
  到着判定」のみ。条件解釈は planner 側で緩めない。Sprint 18 の exit も
  stakeholder 側の明示的な指示による。
- **Pause が有効だったのは期間が短かったから**ではなく、「silent probe
  を禁じる」ルールを明示していたから。次に Pause に入る場合もこの
  構造を維持すること（期間は成り行き、条件は厳格）。

# Sprint 20 (2026-04-21) — C5 ReadOnlyBar component 抽出 + type-bypass Tidy

## Goal

Sprint 19 でスコープ超過として defer した C5 (ReadOnly WarningBar) を
TDD で実装する。合わせて Sprint 15 follow-up の bypass re-probe を実行し、
`useSave.test.ts` に残存した冗長 widening キャストを除去する。

## Probes executed (Sprint start)

1. `rg '\!\.' src/` → **0 hits**。production code に non-null member access なし。
2. `rg 'as\s+[A-Z]' src/` → **2 ファイル**:
   - `src/lib/error-parse.test.ts:133`: `acc as Record<string, unknown>` —
     `typeof acc === "object"` ガード後の index access に必要な assertion。
     `object` 型は index access を持たないため冗長ではない。保持。
   - `src/hooks/useSave.test.ts:12,17`: `mod1 as ModuleInfo | null` /
     `"path" as string | null` — TypeScript が自動 widen するため不要。
     REFACTOR コミットで除去。
3. Backlog #12 (ConflictDialog): `App.tsx:217–223` で open-path は配線済み。
   `useSave.ts:42` に save-path の TODO が残存 — backend が save 中の
   content-conflict error-kind を返さないため引き続き backend-gated。

## C5 再評価

「小さすぎる」か否かを probe した結果:
- Sprint 19 での defer 理由はスコープ超過（C1–C4 4本連続後の疲弊）であり、
  component 化の価値否定ではない。
- `ReadOnlyBar` は `role="status"` + CSS variables + i18n key を持つ
  完結した presentational unit。抽出により App.tsx の render tree が
  合成責務に集中し、テスト境界が明確化される。
- 既存パターン（`Banner`, `TabBar`, `LockDialog` 等）と同形で、
  条件付きレンダーは App.tsx 側が担う（`show` prop なし）。

## TDD サイクル

| フェーズ | 内容 |
| -------- | ---- |
| RED  | `ReadOnlyBar.test.tsx` 作成 — `role="status"` と翻訳テキストを assert |
| GREEN | `ReadOnlyBar.tsx` 作成 — 最小実装でテスト GREEN |
| REFACTOR | App.tsx: inline JSX → `<ReadOnlyBar />`; `useSave.test.ts`: 冗長 widening キャスト除去 |

## 変更コミット

| Commit  | 内容 |
| ------- | ---- |
| (RED)   | `test(ui): ReadOnlyBar renders role="status" with read-only warning` |
| (GREEN) | `refactor(ui): extract ReadOnlyBar component (C5)` |
| (REFACTOR) | `refactor(ui): inline ReadOnlyBar in App.tsx; tidy useSave.test widening casts` |
| (docs)  | このセクション + Sprint 15 index demotion |

## 受け入れ基準 (達成)

- `bun run test` **63/63** 緑 (既存 62 + ReadOnlyBar 1 追加)
- `bun run tsc --noEmit` クリーン
- App.tsx LOC: 229 → 215 (ReadOnlyBar inline JSX 13行 → 1行)
- `cargo test --lib` 未変更 (backend 無変更)

## Key decisions

- **`show` prop なし**: 既存コンポーネント群（`LockDialog`, `TrustGuideDialog` 等）
  と同様に、条件付きレンダーは呼び出し側 App.tsx が担う。コンポーネントが
  自分の表示/非表示を制御する props を持つと責務の漏洩になる。
- **`vi.fn() as (...)` キャストは保持**: `vi.fn()` が返す `Mock` 型を
  呼び出し側で期待する signature に強制するのは vitest の慣用パターン。
  `vi.fn<(s: string | null) => void>()` の代替はあるが、既存テストの
  一貫性を優先し今 Sprint ではリスコープしない。
- **バックログ #12 (save-path) はそのまま**: backend に content-conflict
  error-kind がないため実装不可。`useSave.ts:42` TODO は状態変化まで保持。
- **type-bypass arc**: `!\. src/` ゼロ hit で arc は維持されている。
  `as\s+[A-Z]` の production hits ゼロ確認 — テストコードの冗長キャスト
  2件を除去して arc の品質も前進。

## Follow-ups

- Backlog #12 は backend が save-path の content-conflict error-kind を
  返すようになったら `useSave.ts:42` TODO を実装起点として PBI 化する。
- `vi.fn<(...)>()` スタイルへの統一は rule-of-three 到達後に検討。
- Sprint 18 follow-ups (#15, #16, #17) は引き続き design-weight
  items — explicit Planning を要する。

