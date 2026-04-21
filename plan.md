# Verde — Sprint History and Backlog (plan.md)

Compressed record of Sprints 3–17 plus consolidated follow-up backlog.

**Plan-bloat prevention policy (from Sprint 16):** at any time, only the
three most recent *decision-bearing* sprints are retained in full detail.
All earlier sprints collapse to one-line rows in the index table below —
`git log` + sprint tags are the authoritative source for their
commit-level detail. Compression-only sprints (like Sprint 16 itself) do
not consume a detail slot, and probe-only refinement sprints occupy one
slot at whatever density their outcome requires (often < 50 lines).
Currently detailed: Sprint 30 / 31 / 32. A planner adding a new sprint
section must demote the now-oldest detailed sprint into the index row in
the same commit. Sprint 17–19 were folded into index rows during Sprint
24 housekeeping (closing a pre-existing detail-drift). Sprint 23 was
demoted during Sprint 26 housekeeping. Sprint 24 was demoted during
Sprint 27 housekeeping. Sprint 25 was demoted during Sprint 28
housekeeping. Sprint 26 was demoted during Sprint 29 housekeeping.
Sprint 27 was demoted during Sprint 30 housekeeping. Sprint 28 was
demoted during Sprint 31 housekeeping. Sprint 29 was demoted during
Sprint 32 housekeeping (Pause (2) 終了記録 は standalone section として
切り出し、Pause (1) と並ぶ累積履歴方式を踏襲)。

## Sprint 3–29 summary index

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
| 17     | Probe-only refinement; orthogonal probe axis validates exercise                 | docs-only (no code commits). `TODO|FIXME|XXX` scan surfaced `App.tsx:211` ConflictDialog TODO as backlog #12 (backend-gated on content-conflict error-kind). Plan-bloat policy promoted from example to explicit preamble rule. Third refinement-only cycle → escalation advisory to product. |
| 18     | Security hardening: 2 CRITICAL + 2 MEDIUM + Win32 feature-flag bonus            | `32b8d5f` MCP path-traversal (`safeModulePath` whitelist + containment); `7c00520` PS denylist `validate_ps_arg`; `084ee38` lock TTL-7d fallback + `Win32_System_Threading` feature; `c875c58` extract `EXCEL_OPEN_SUBSTRINGS` + JP-locale pinned-negative test (Sprint 25 will flip); `e8064d2` drop dead `current_machine_name`. Pause exited via restart-condition (c). Follow-ups #15/#16/#17 registered. |
| 19     | App.tsx 責務分割 (352→229 LOC; behavioral change ゼロ)                          | `072b44b` C1 `useErrorRouting` (+7 tests); `352d74c` C2 `useModuleTabs` (+7, stale-closure fix); `702e7fa` C3 `useOpenFile` (+9); `19d7d5a` C4 `useSave` (+7). C5 `ReadOnlyBar` deferred (landed in Sprint 20). Frontend 32 → 62 tests; cargo 55 unchanged. |
| 20     | C5 `ReadOnlyBar` component extraction + `vi.fn` widening-cast tidy              | `48074d9` RED test; `afa0e27` GREEN extraction; `d4a27e1` wire-up + `useSave.test` widening-cast removal; docs `b3b0b24`. App.tsx LOC 229 → 215; bypass arc still at zero `!\.` hits; `vi.fn<>()` rule-of-three queued (resolved in S21). |
| 21     | `vi.fn()` cast Tidy First (rule-of-three 到達, 3 hits across 2 files)            | `03a603a` replace `vi.fn() as (Fn)` with typed `vi.fn<(Fn)>()`. Frontend 63/63 tests unchanged; `rg 'vi\.fn\(\) as \(' src/` → 0. Key decision: generic form is vitest's idiomatic pattern (safer than unsafe downward cast). #15 design-weight deferred to Sprint 22 Planning (macOS TDD 不適合認定 → Sprint 22 で env-var 経路確定 → Sprint 23 で実装完了)。 |
| 22     | `#15` PS 引数渡しアーキテクチャ設計 (Planning-only, docs commit)                 | `f3dbd32` 設計記録: Approach 1 (env-var 経由) を採択。Approach 2 (`-File` + 一時ファイル) は `tempfile` crate 追加 + クラッシュ残留リスクでコスト過大、Approach 3 (escape 強化) は injection 根絶せず却下。Rust `Command::env("VERDE_*", ...)` / PS `$env:VERDE_*` / `VERDE_` prefix policy を確定。実装は Sprint 23 で履行 (`9cc2c12`)。 |
| 23     | `#15` 実装: PS 引数を env-var 経由へ移行 (Planning → 実装 pattern 成立)         | `4c00585` Tidy First (PS 本体 `const` 昇格 + `str::replace`); `cf84fd8` RED (injection-flavored → platform error); `9cc2c12` GREEN (env-var 経路配線 + `validate_ps_arg` + injection tests 削除, -9 → 48 Rust tests); docs `f3dbd32`. `.env_clear()` 不使用 (PS `PSModulePath` 等親プロセス依存を破壊しない) と denylist 完全削除 ("env-var が構造的排除なので validator 残置は anti-pattern 誘発") が durable 判断。Unicode/`$` 含みパスは副次的に回復。`vba_bridge.rs` source を grep すれば `$env:VERDE_*` マッピング 4 件は現物確認可能。 |
| 24     | `#16` / `#17` design-weight 評価 Planning-only + Sprint 17–19 index demotion    | docs-only (no code commits). Sprint 25 着手対象を `#17` (HRESULT EXCEL_OPEN) に確定。採択根拠: user-visible value (日本語 Excel の EXCEL_OPEN ダイアログ完全不発) × Sprint 18 pinned-negative が自然な RED × pure helper で macOS full TDD × Sprint 23 成果 (PS static const) が基盤。`#16` 後回し理由: 3 OS 分岐 + dev-env fallback で design surface が #17 の約 2 倍、TTL 7d fallback で「待てば解ける」問題に圧縮済み。`sysinfo` crate 却下 ("1 箇所の needs に対して依存代償過大"、`windows`/`libc` 既存 FFI surface で足りる) が durable。再評価 trigger (i) production PID reuse 報告 (ii) `#17` 完了後の Sprint N として起票、の 2 本で保留を確定ステータスに格上げ。Sprint 17–19 の詳細 section を index row へ折り畳み、plan-bloat rule ("3 most recent detailed") への pre-existing drift を閉鎖。Commit discipline notes section (`$` HEREDOC escape rule) を本 Sprint で新設。 |
| 25     | `#17` 実装: HRESULT EXCEL_OPEN 分類 (locale 非依存化)                           | `d6c2d88` Tidy1 (`parse_hresult_tag` pure helper + 3 tests, `#[allow(dead_code)]`, 48 → 51); `32be5c3` Tidy2 (`ErrorKind` enum + `EXCEL_OPEN_HRESULTS` + `classify_hresult` + 4 tests, 51 → 55); `799f77e` RED (Sprint 18 pinned-negative を positive flip + JP fixture `VERDE_HRESULT=0x80070020`); `6578c40` GREEN (`concat!` で `HRESULT_CATCH` 合成 / `InnerException.HResult` 優先 / `is_excel_open_error` 先頭に HRESULT 経路配線, 55 passed); `8b86c72` Tidy-after (substring fallback 残置判断 + pin 2 件 `E_ACCESSDENIED`/tagless-english で 55 → 57); docs `aa?` 等。Durable 判断: HRESULT 先・substring 後経路固定、`concat!` で外部 crate 追加ゼロ (Sprint 22 `tempfile` / 本 Sprint `const_format` 却下と並ぶ)、`InnerException.HResult` 優先で `.NET` `TargetInvocationException` wrap をカバー、`ErrorKind` 3 variants (`PermissionDenied`/`NotFound`/`Unknown`) は UI branches 未配線で variant 単位 `#[allow(dead_code)]`。JP-locale 実機 verify は post-Sprint follow-up として Sprint 28 F4 候補化。 |
| 26     | `#16` lock staleness 3-OS Approach 具体化 + Sprint 27 6-commit 骨格 (Planning-only) | `7fa3655` docs — Sprint 24 で base line 採択された「OS native API + macOS cfg-gate fallback」の具体化。API 経路 (Windows `QueryFullProcessImageNameW` / Linux `/proc/<pid>/comm` / macOS `None` fallback)、TDD 戦略 (provider 注入 + pure helper `is_stale_by_image_match`)、commit 分割 (Tidy1 pure helper / Tidy2 provider / RED stub+foreign-image / GREEN wiring / Tidy-after macOS fallback pin / docs) を durable 化。Key decisions: (i) Sprint 24 却下 (`sysinfo` crate / `libproc` FFI / `ps -p` shell-out) を蒸し返さない (ii) Linux は `/proc/<pid>/comm` のみ採用 (`/exe` は permission-dependent + basename 衝突 3 例 surface 後 rule-of-three 風に再評価) (iii) provider 型 `Option<String>` + OS cfg で `None` の 2 意味切り分け (Windows/Linux = 検証済み not-us / macOS = 検証不可 fallback、`Option<Result<_, _>>` 昇格より invariant を 1 関数内に閉じ込める) (iv) macOS fallback は behavioral 変化ゼロ (`is_pid_alive + TTL` 完全同一) (v) `QueryFullProcessImageNameW` feature flag 追加不要 (Sprint 18 `Win32_System_Threading` 既有) (vi) pinned-negative 遺産なし → Sprint 27 commit 3 で新規 RED `is_stale_reaps_same_machine_alive_pid_with_foreign_image` を意図作成。Sprint 23 index demotion 同梱。予測 +8 → 65 (Sprint 27 実績 +7 → 64; cfg-gated smoke の host-specific compile で -1 overcount; Sprint 27 retrospective で per-host 表記 convention 化)。 |
| 27     | `#16` 実装: lock staleness image-name matching (Sprint 26 6-commit 骨格の実行記録) | `9288277` Tidy1 (`is_stale_by_image_match` pure helper + `EXPECTED_BASENAME` OS cfg const + 4 pure tests, `#[allow(dead_code)]`, 57 → 61); `9c55913` Tidy2 (`process_image_basename` 3-OS cfg-gate provider + macOS smoke test, 61 → 62 on macOS host); `3045fb0` RED (`is_stale_with_provider` stub + `is_stale_reaps_same_machine_alive_pid_with_foreign_image` FAIL); `8d6df43` GREEN (provider 配線 + cfg 2 枝で `None` の 2 意味切り分け + `is_stale` を delegator 化 + `#[allow(dead_code)]` 一括解除, RED 反転); `629de6e` Tidy-after (`is_stale_macos_fallback_respects_ttl` pin, 63 → 64); docs (Sprint 27 retrospective)。Durable 判断: (i) `is_stale` を `is_stale_with_provider` への delegator 化で production / test 経路統合 → drift 構造的ゼロ化 (ii) RED commit で API contract 先行凍結 ("契約先行/実装後行" pattern Sprint 25 と同) (iii) `EXPECTED_BASENAME` macOS 値残置 (将来 native API wire 用 + pure helper 単体 test 簡素化) (iv) **rule-of-three cfg-gate 共通化 skip** (`HRESULT cfg / is_pid_alive cfg / process_image_basename cfg` の 3 surface 到達も各々 OS-specific に異なる API 呼ぶため共通 helper 抽出は cfg gymnastics 移動のみで net gain ゼロ — 「共通 surface 3 箇所」≠「cfg 構文 3 回」durable 解釈)。`+7 → 64` Rust tests on macOS host。Follow-ups: F1 (Windows `QueryFullProcessImageNameW` 実機 verify) / F2 (Linux container `/proc/<pid>/comm`) / F3 (Windows long-path `buf[260]`) を Sprint 28 で trigger 付き候補化。 | |
| 28     | Planning-only: Follow-up triage (F1-F4) + Sprint 29 候補筆頭選定 (Sprint 31 housekeeping で demoted) | `36b0c48` docs — Sprint 27 Follow-up 3 件 (F1 Windows verify / F2 Linux container `comm` / F3 long-path) + Sprint 25 JP-locale verify (F4) を **trigger 条件付き候補**として plan.md に durable 記録。Sprint 29 候補筆頭 = F4 (JP-locale EXCEL_OPEN verify; `InnerException.HResult` 優先が macOS full TDD では検証不能な durable risk、Sprint 25 Try 参照)。rule-of-three cfg-gate 共通化 skip を本 Sprint で durable 確定 (Sprint 27 継承; BSD 等 4 つ目 OS provider + 非依存共通ロジック surface を再評価 trigger に固定)。Planning-only docs Sprint pattern 4 回目 (S22 / S24 / S26 / S28)、Sprint 22→23 / 24→25 / 26→27 の "Planning Sprint → Implementation Sprint" pattern 踏襲。Sprint 29 Try に「trigger 成立状況を checklist として走らせる」を繰越。 |
| 29     | Planning-only: F1-F4 trigger 再評価 + Intentional Pause (2) 再起動宣言 (Sprint 32 housekeeping で demoted) | docs-only — Sprint 28 Try の「trigger 成立状況を checklist として走らせる」を本 Sprint で execute し、F1-F4 **全 4/4 未成立** を確認 (planner 巡回 7 回に新 signal ゼロ)。代替 product-signal 由来 PBI もゼロ (backlog #1–14 全て external gate 継続、#15/#16/#17 は CLOSED 済み)。結果 **Intentional Pause (2)** を durable 再起動宣言、Pause (1) 構造を踏襲 (silent probe 禁止 + 条件解釈緩和禁止 + stakeholder 明示指示のみ exit)。durable 確立 key decisions: (i) **passive 滞留 → 正式 Pause へ escalate 手続き**: planner 巡回 N 回 silent 後 1 Planning-only Sprint で checklist 走査 → 正式 Pause 宣言 を durable 化、「未正式化 de-facto pause」を放置しない (ii) Pause は累積履歴として管理 (Pause (1) 体裁を書き換えず Pause (2) を **新規追加**、Pause (3) 発生時も同 pattern) (iii) 時間経過を trigger 緩和ではなく「正式 Pause 宣言」に使う区別 (iv) sliding window housekeeping (Sprint 26 index demotion)。Pause (2) **exited 2026-04-21 by Sprint 30** (stakeholder `../verde-lsp, ../treesitter-vba 組込み着手` 投入で解除、Sprint 30-34 LSP/treesitter 統合に着地)。Pause (2) 終了記録の durable 詳細は本ファイル内「Intentional Pause (2) — 終了記録」standalone section (Pause (1) 直後) 参照。 |

Sprint 5 sweep non-i18n catalogue (technical identifiers, not localization targets — future sweeps should skip): `Sidebar.tsx:12–15` emoji icons; `App.tsx:121` dev console.log; `Editor.tsx:89` CSS font stack.

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
| 16  | ~~Image-name-based lock staleness (Windows + Linux + macOS cfg-gate)~~ — **CLOSED in Sprint 27** | S18 | `is_stale_by_image_match` pure helper + `process_image_basename` 3-OS cfg-gate provider + `is_stale_with_provider` を `lock.rs` に実装。`is_stale` は delegator 化で production / test 経路を統合。macOS は provider `None` → TTL fallback で Sprint 18 挙動を bit-perfect 維持 (pinned)。`+7 → 64` Rust tests on macOS host (Sprint 26 予測 +8 → 65 から -1; cfg-gated smoke tests の host-specific compile が overcount を生んだため)。 |
| 17  | ~~HRESULT-based EXCEL_OPEN classification~~ — **CLOSED in Sprint 25** (`6578c40`) | S18 | locale-agnostic path live via `VERDE_HRESULT=0x...` stderr tag; JP-locale dialog now fires |

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

## Intentional Pause (2) — 終了記録 (exited 2026-04-21 by Sprint 30)

Sprint 29 で再起動、同日 Sprint 30 で解除された 2 回目の Intentional
Pause。Pause (1) L80-102 既定ルール「前回 Pause の体裁を書き換えるのでは
なく、履歴として累積する」を踏襲し、本 section は Pause (2) を Sprint 32
housekeeping (Sprint 29 detail demotion) の際に standalone 化したもの。
Pause (2) の durable content は **Sprint 32 で書き換えられず保全** されて
おり、Pause (3) が将来 surface する場合も同 pattern で本ファイル内に累積。

**再起動根拠** (Sprint 29 時点、3 条件すべて合致):

- (a) Sprint 28 Try 項目の execute として走らせた F1-F4 trigger 再評価が
  **全 4/4 未成立**: F1 Windows `QueryFullProcessImageNameW` 実機 verify
  (CI / stakeholder 環境ゼロ) / F2 Linux container `/proc/<pid>/comm`
  (container deploy 決定ゼロ、basename 衝突実例ゼロ) / F3 Windows long-path
  (>260 char 環境での起動実例ゼロ) / F4 JP-locale EXCEL_OPEN E2E verify
  (JP Windows stakeholder 環境準備 signal ゼロ)
- (b) `scrum.ts` 不在 / plan.md backlog / planner 能動 probe いずれも
  **代替 product-signal 由来 PBI を surface しない**: open backlog #1–14 は
  全て external gate (product decision / telemetry / restructure PBI),
  bypass arc (`!\.` / `as [A-Z]` / `@ts-ignore`) は Sprint 26 以降同一、
  rule-of-three monitoring も Sprint 27/28 で durable skip 確定
- (c) Sprint 28 完了後 planner 巡回 **7 回の passive 滞留** (silent 不介入)
  を「未正式化の de-facto pause」と認定、正式化することで stakeholder
  signal をより明示的に要求する姿勢を回復

**再開条件 (Sprint 29 で設定、Pause (1) 原則踏襲)**:

- (a) stakeholder から明示的な新規 PBI 投入 (Pause (1) の exit pattern 再現)
- (b) F1-F4 のいずれかの trigger 条件が stakeholder / 外部 signal で成立
  - F1: Windows CI 整備完了 / image-name mismatch 実例
  - F2: Linux container deploy 決定 / basename 衝突実例 3 件
  - F3: >260 char path 環境での Verde 起動実例 3 件
  - F4: JP-locale Windows stakeholder 環境準備完了 / CI JP-locale runner 整備
- (c) Sprint 17 "orthogonal probe axis" 相当の新 signal axis が surface
  (planner 単独では発掘できない範囲)

**exit 履歴** (Sprint 30 で durable 化):

- **Pause (2) exited 2026-04-21 by Sprint 30** — 再開条件 (a) stakeholder
  明示的 PBI 投入 (`../verde-lsp, ../treesitter-vba の組込みに着手したい`)
  により解除。Sprint 30-34 (LSP / treesitter 統合) に着地。Pause 宣言
  (Sprint 29) から exit (Sprint 30) までの interval が短かったことは
  Pause 構造が stakeholder signal 要求装置として機能した証として durable
  化。

**Pause (2) が機能した証拠**:

- passive 滞留 7 巡 → 正式 Pause escalate → 同セッション内 stakeholder
  投入、という 3 段階が Pause を「stakeholder signal を明示要求する装置」
  として機能させた。期間 (Sprint 28-29 間 7 巡 + 宣言後 < 1 時間) ではなく
  「silent probe 禁止 + 条件解釈緩和禁止 + stakeholder 明示指示のみで
  exit」の構造が有効性を担保 (Pause (1) と同根)。
- stakeholder からの投入内容が Sprint 28 の F1-F4 候補でも open backlog
  でもなく、**sibling repo 3 つ横断の外部依存統合** (verde-lsp / treesitter-vba)
  という planner 能動 probe では surface しなかった axis だった — Pause
  (1) の Sprint 18 security 投入と同じく "orthogonal probe axis" (Sprint 17)
  を最も強い形で実証。

**再発防止の教訓 (Pause (1) 線 + Pause (2) 追加分)**:

- Pause (1) で durable 化済みの 3 原則 (silent probe 禁止 / 条件解釈緩和
  禁止 / stakeholder 明示指示のみで exit) を Pause (2) でも全て維持。
- Pause (2) で新規確立: **passive 滞留 (N 巡 de-facto pause) と正式 Pause
  の境界を明示化する pattern**。planner 巡回 N 回の passive 滞留を検知したら
  1 Planning-only Sprint 単位で trigger 再評価 checklist を走らせ、trigger
  全未成立 + 代替 PBI ゼロなら正式 Pause に escalate する手続きを durable
  化。Pause (3) 発生時にも同 escalate 手続きを適用。

# Sprint 26 / 27 / 28 / 29 — (index row に折り畳み済み)

Sprint 26: Sprint 29 housekeeping で demoted。詳細は冒頭の `Sprint 3–28
summary index` 内「26」行 + `git show 7fa3655` を参照 (Sprint 27 6-commit
骨格の Planning-only 確定)。

Sprint 27: Sprint 30 housekeeping で demoted。詳細は同 index「27」行 +
`git show 9288277 9c55913 3045fb0 8d6df43 629de6e` を参照 (Sprint 26 骨格
の実装記録、`#16` CLOSED, +7 → 64 Rust tests on macOS host)。Sprint 27
Follow-ups (Windows / Linux / long-path 実機 verify) は Sprint 28 candidate
table の F1-F3 に転記済み。Sprint 27 Try (per-host test count 表記 +
rule-of-three cfg-gate 解釈) は Commit discipline notes と Sprint 28 design
で durable 化済み。

Sprint 28: Sprint 31 housekeeping で demoted。詳細は同 index「28」行 +
`git show 36b0c48` を参照 (Planning-only Follow-up triage, F1-F4 trigger
条件付き候補化、Sprint 29 筆頭 F4 選定)。Sprint 28 の cfg-gate rule-of-three
skip 判断と F1-F4 table は Sprint 29 で execute され、`trigger 全未成立 →
Intentional Pause (2) 再起動` に着地。F1-F4 trigger 定義は Intentional
Pause (2) 終了記録 section (L80+) の「再開条件 (b)」に保全されており、
Sprint 32+ で再参照可能。

Sprint 29: Sprint 32 housekeeping で demoted。詳細は同 index「29」行 +
本ファイル内「Intentional Pause (2) — 終了記録」standalone section を
参照 (Planning-only F1-F4 trigger 再評価 execute + 代替 PBI 探索 + Pause
(2) 再起動宣言 + 即日 Sprint 30 exit)。Sprint 29 の durable content は
(i) Pause (2) 宣言本体 (ii) passive 滞留 → 正式 Pause escalate 手続き
(iii) Pause 累積履歴管理ルール の 3 点で、(i)(ii)(iii) はいずれも
Pause (2) standalone section + Sprint 29 index row に二重保全されている。
Sprint 29 の `[Due: Sprint N+1 Probes executed]` label 運用は Sprint 30
以降 (L485-488 相当) 継承済み。

# Sprint 30 (2026-04-21) — Planning-only: Pause (2) exit + LSP/treesitter 統合 5-sprint 設計確定

## Goal

docs-only Planning Sprint (Sprint 22 / 24 / 26 / 28 / 29 に続く 6 回目、
かつ Sprint 22→23 / 24→25 / 26→27 の "Planning Sprint → Implementation
Sprint" pattern を LSP/treesitter 統合という **Sprint 18 以来最大の外部依存
追加** に適用する形)。Intentional Pause (2) (L424-504) を再開条件 (a)
「stakeholder 明示的 PBI 投入」で exit し、sibling repo `verde-lsp` (成熟
stdio LSP server, 148 tests + Windows CI) と `treesitter-vba` (tree-sitter
grammar, corpus 72 + highlight 6 fixtures) の verde-vba への統合設計を
durable 化。5 つの設計分岐を stakeholder 回答で確定、5-sprint 分割
(30 Planning / 31 TS frontend highlight / 32 LSP sidecar 配線 / 33 verde-lsp
内部 parser swap / 34 workbook-context generation) を固定。本 Sprint は
docs 1 commit で閉じ、コード変更ゼロ。

## Pause (2) exit 宣言

**exit trigger**: 再開条件 (a)「stakeholder 明示的 PBI 投入」(L442-444)。
stakeholder 発言「../verde-lsp, ../treesitter-vba の組込みに着手したい」
が Sprint 17 "orthogonal probe axis" 相当の新 signal axis (= planner の
backlog / bypass arc / rule-of-three probe いずれでも surface しなかった
外部 repo 統合 PBI) を構成し、Pause (2) Intentional Pause 構造が期待通り
stakeholder 行動を引き出した形 (Sprint 18 exit pattern の再現)。

**Pause (2) の durable 教訓** (次回 Pause (3) 設計時に参照):

- Pause (1) exit と同パターン: 期間 (Sprint 28-29 間 planner 巡回 7 回 +
  Pause 宣言後 < 1 時間) ではなく「silent probe 禁止 + 条件解釈緩和禁止 +
  stakeholder 明示指示のみで exit」の構造が有効性を担保。
- Pause (2) 宣言 (Sprint 29) から exit (本 Sprint 30) までの interval が
  短かったことは **失敗ではなく成功の証**。passive 滞留 7 巡 → 正式 Pause
  escalate → 同セッション内 stakeholder 投入、という 3 段階が Pause を
  「stakeholder signal を明示要求する装置」として機能させた。
- Sprint 29 で新規確立した「passive 滞留 → 正式 Pause への escalate 手続き」
  (L514-519) の durable 化が次回に向け機能確認済み。

Pause (2) section (L424-504) は書き換えず、exit 履歴として本 Sprint 30
で新規 bullet 追加 (下記 Follow-ups 参照)。Pause (1) L80-82 既定ルール
「前回 Pause の体裁を書き換えるのではなく、履歴として累積する」を踏襲。

## 設計決定 (stakeholder 回答で確定、durable)

### D1: LSP transport = Tauri sidecar binary (via `tauri-plugin-shell`)

**採択**: `verde-lsp` を stdio LSP server のまま child process として起動。
verde-vba backend は Tauri command / event 経由で stdin 書き込み + stdout
メッセージ中継を提供。

**却下**: verde-lsp を Rust crate として verde-vba backend に直リンク (embed)。
理由: (i) tokio runtime 衝突リスク (verde-lsp は `tokio = { features = ["full"] }`
独自 runtime、verde-vba backend は Tauri 管理 runtime、nested runtime panic
surface) (ii) LSP crash が Tauri UI を巻き込む (iii) verde-lsp 側の 148 test
は stdio E2E 経路 (`stdio_lifecycle_completes_gracefully`) を含み、embed 化で
test 資産の再評価が必要。

**durable 根拠**: process 境界で crash isolation、verde-lsp 側の release 独立性
(verde-vba と異なるバージョンを差し替え可能)、stdio LSP は VS Code / Neovim /
Emacs 等他 client との互換性も保存。

### D2: Frontend LSP client = `monaco-languageclient` + Tauri IPC bridge

**採択**: `monaco-languageclient` + `vscode-jsonrpc` browser transport。stdio↔IPC
の変換 shim (`src/lib/lsp-bridge.ts` 新規 予定) を薄く書き、Tauri command
`lsp_send(message)` / Tauri event `lsp://message` で backend と往復。

**却下**: Language Server Protocol を自前 client で再実装。理由: LSP 仕様
(completion / hover / diagnostics / rename / code action / signature help /
document symbol / workspace symbol / references / document highlight / call
hierarchy / folding range / inlay hint / formatting) を網羅する verde-lsp の
capability を小規模自前 client でカバーするコストが過大。

**durable 根拠**: `monaco-languageclient` は VS Code 実装ベース、verde-lsp の
tower-lsp 0.20 と protocol-level で完全整合。

### D3: treesitter-vba の役割 = frontend WASM semantic tokens + verde-lsp 内部 parser swap (**両方**)

**採択** (stakeholder 指示): (i) frontend で `web-tree-sitter` WASM に
`tree-sitter-vba.wasm` を読ませて Monaco semantic tokens provider を実装
(Sprint 31 で現 `monaco-vba` Monarch grammar を置換) (ii) verde-lsp 内部の
logos-lexer + 再帰下降 parser を tree-sitter-vba (Rust binding `tree-sitter-vba`
crate 0.1) に置換 (Sprint 33 で AST 構造は保ちつつ producer のみ差し替え、
148 tests 緑維持を制約条件化)。

**却下**: 現 `monaco-vba` Monarch grammar + verde-lsp 自前 parser を維持。
理由: (i) Monarch は regex-based で reopen / nested delimiter が脆弱、VBA
line continuation `_<NL>` や `Rem` comment が既に苦手 (ii) verde-lsp 自前
parser と tree-sitter-vba grammar で 2 つの "VBA の真" を維持するコストが
恒常的に発生。treesitter-vba は既に 72-corpus + 6 highlight fixtures で
stakeholder 側 ground truth を提供しており、verde-lsp 側の parser を単一
truth source (tree-sitter-vba) に寄せることで duplication を構造的に排除。

**durable 根拠**: tree-sitter-vba は verde/ 配下の **sibling repo として
長期 maintain 対象**。verde-vba 側の highlight + verde-lsp 側の analysis で
同じ AST を共有することで、grammar bug fix が両方に同時反映される構造。

**Sprint 33 リスク (Planning で durable 化)**: verde-lsp の 148 tests は
la-arena AST shape 前提の analysis コード (`symbols.rs` / `resolve.rs` /
`diagnostics.rs` / `completion.rs` 等) を含む。戦略は「**AST shape を保ち、
producer (parser) のみ差し替え**」: tree-sitter CST → verde-lsp の
`ast::*` ノードへの converter を `parser/ts_adapter.rs` (仮) として追加、
既存 `parser/parse.rs` は converter 経由で残置 or 削除。`la-arena` shape を
壊さなければ analysis 側は無変更。ts crate 追加で依存グラフに tree-sitter
0.25 + tree-sitter-vba 0.1 が入る。

### D4: Excel context (`workbook-context.json`) = Sprint 34 に延期

**採択**: verde-lsp は既に `excel_model::context.rs` で `workbook-context.json`
欠如時 fallback (空 context) を持つ。Sprint 32 の LSP 配線時点では空 context
で LSP 起動 → completion / hover / diagnostics など Excel 非依存 capability が
機能する状態を先行提供。Sprint 34 で verde-vba backend (PowerShell COM 経由) に
`export_workbook_context()` 新 command を追加し、`.xlsm` open 時 + sync 時に
`%APPDATA%/verde/projects/<sha256>/workbook-context.json` を生成、LSP 起動時
`initializationOptions.workbookContextPath` で渡す。

**却下**: Sprint 32 に Excel context 生成を抱き込む。理由: PowerShell COM の
新 export 経路は `vba_bridge.rs` 既存 export/import pattern (Sprint 18/23 で
env-var 化済み) の延長で独立 PBI 化可能。Sprint 32 の LSP 配線と絡めると
commit boundary が曖昧化、Sprint 23 Planning Sprint pattern の美点 (1 Sprint
= 1 concern) を崩す。

**durable 根拠**: verde-lsp 側で fallback 経路が既に実装済みなので Excel
context を遅延生成しても LSP 品質の段階的 rollout が可能。

### D5: sidecar binary 取得 = CI 連携 (stakeholder 指示)

**採択** (stakeholder 指示): verde-vba の GitHub Actions が release build 時に
verde-lsp の GitHub Releases から各 OS artifact (`verde-lsp-x86_64-pc-windows-msvc.exe`
/ `verde-lsp-x86_64-apple-darwin` / `verde-lsp-aarch64-apple-darwin` /
`verde-lsp-x86_64-unknown-linux-gnu`) を download、Tauri sidecar 命名規約
(`src-tauri/binaries/verde-lsp-<target-triple>`) に配置。dev 時は `just fetch-lsp`
recipe で同じ artifact を local download (Justfile 追加 予定 Sprint 32)。

**却下**: (i) cargo workspace 化 (`verde/Cargo.toml` で 3 crate 統合)。理由:
verde-lsp / treesitter-vba / verde-vba は **release cycle が独立**。workspace
化すると verde-lsp の patch release のために verde-vba tag が巻き添えになる。
(ii) git submodule。理由: submodule の pin は commit hash 単位で、stakeholder
が verde-lsp に hot-fix を入れた時の伝播遅延が発生、branch 追随も脆弱。
(iii) local cargo build (`cargo build -p verde-lsp`)。理由: dev experience は
良いが CI 再現性が host toolchain に依存、Windows host での openssl linking
等で surface する問題を避けられない。

**durable 根拠**: GitHub Releases artifact download は (a) verde-lsp release
cycle 独立 (b) CI 再現性 (artifact は immutable) (c) Tauri sidecar 慣習と整合
(3 OS × 2 arch) の 3 条件を満たす最小コスト。

**Sprint 32 / 34 に先送りする詳細**:

- Sprint 32: GitHub Actions workflow `download-verde-lsp.yml` (or step in
  existing build workflow) 書く。verde-lsp の release tag 固定方針 (latest-stable
  vs version pin) は Sprint 32 Planning で再確認。
- Sprint 32: `just fetch-lsp` recipe で dev 用 download 経路を揃える
  (CI / local で artifact 取得 URL / SHA256 verify を共有)。
- Sprint 31 の treesitter artifact (`tree-sitter-vba.wasm`) も同様に CI 経由
  download とし、`public/tree-sitter-vba.wasm` に配置、frontend が静的に
  load する形 (Sprint 31 Planning で詳細化)。

## 5-sprint 分割方針 (durable)

| Sprint | 主題 | 見積 | 依存 | behavioral 変化 |
|--------|------|------|------|----------------|
| **30** | 本 Sprint。Pause (2) exit + D1-D5 確定 + 5-sprint 分割 durable 化 | docs-only | なし | ゼロ |
| **31** | treesitter WASM frontend semantic tokens (Monarch 置換) | M | tree-sitter-vba.wasm artifact 取得 | highlight のみ差し替え、editor 操作は無変更 |
| **32** | LSP sidecar 配線 (verde-lsp binary + monaco-languageclient + completion/hover/diagnostics) | L | verde-lsp release artifact 取得、D1/D2/D5 | LSP capability 新規追加、既存機能は無変更 |
| **33** | verde-lsp 内部 parser swap (logos+RD → tree-sitter-vba Rust binding) | L | Sprint 31/32 で treesitter-vba.wasm + LSP binary 配線済み、tree-sitter-vba crate 採用、verde-lsp 148 tests 緑維持 | verde-lsp 内部のみ、外部 API (LSP) 無変更 |
| **34** | Excel context (`workbook-context.json`) PowerShell COM export + LSP initializationOptions 配線 | M | Sprint 32 の LSP 基盤 + `vba_bridge.rs` 既存 export pattern | completion / diagnostics が sheet / table 名を認識 |

**Sprint 33 は verde-lsp 側の Sprint として実装** (verde-lsp リポジトリに commit、
verde-vba は artifact download 先の tag を更新するのみ)。verde-vba 側の plan.md
では **依存タグの更新履歴を記録** する方針 (commit body で "verde-lsp v0.X.Y に
追随" を durable 化)。

**各 Sprint は TDD / Tidy First を厳守**: Sprint 18-27 で確立した Red-Green-Refactor
+ 契約先行 / 実装後行 pattern を外部依存統合にも適用。Sprint 31 の Monarch
置換は golden-string 比較 highlight test で characterize、Sprint 32 の
monaco-languageclient 配線は Tauri command / event pair の pure test 可能部分
(transport shim) を先行実装。

## KPT

- **Keep**: Planning-only docs Sprint (本 Sprint で 6 回目) を 1 commit に
  閉じ込める pattern が外部依存統合という最も重い decision set にも機能。
  5 つの設計分岐を stakeholder Q&A で 1 pass に閉じ、次 Sprint 以降の
  "設計議論の蒸し返し" リスクを durable 化で排除。Sprint 22→23 / 24→25 /
  26→27 の "Planning Sprint → Implementation Sprint" pattern を **4 実装
  Sprint (31-34)** に一気に伸ばす、現行 Scrum 運用で最大の前倒し Planning。
- **Problem**: Sprint 30-34 を通して **sibling repo 3 つ横断** (verde-vba /
  verde-lsp / treesitter-vba) になる。verde-vba plan.md だけで状況追跡
  困難。Sprint 33 は verde-lsp 側 sprint として実装する方針だが、
  cross-repo 依存がある sprint の progress tracking 手順は本 Sprint では
  確定せず (**Try 項目** に繰り越し)。
- **Try**: Sprint 31 着手時に cross-repo progress tracking 手順を確定
  (候補: (i) verde-vba plan.md に "external dependency" 行を Sprint ごとに
  追加、(ii) handoff.md に sprint 単位の cross-repo pointer を追加)。
  `[Due: Sprint 31 Probes executed]` label 付きで durable 化 (Sprint 29
  Try 項目 L485-488 で新設した label 運用を踏襲)。

## 受け入れ基準

- Pause (2) exit 宣言が本 Sprint の commit で記録される ✅ (本 section)
- D1-D5 が durable 確定 ✅ (本 section)
- 5-sprint split が durable ✅ (本 section)
- preamble `Currently detailed` を `28 / 29 / 30` に更新 ✅
- Sprint 27 index demotion + 詳細 section 削除 ✅
- `cargo test --lib` / `bun run test` / `bun run tsc --noEmit` / `cargo clippy --lib -- -D warnings` が Sprint 27 時点 (64 / 63 / 0 / 0) と同一 (docs-only のため) — 受け入れ段階で確認

## 変更コミット

| Commit | 内容 |
|--------|------|
| (本 docs) | Sprint 30 Planning section 追加 (Pause (2) exit + D1-D5 durable + 5-sprint split) + preamble `27 / 28 / 29` → `28 / 29 / 30` + Sprint 27 index demotion + index 見出し `Sprint 3–26` → `Sprint 3–27` |

## Key decisions (durable; Sprint 31+ での蒸し返し禁止)

- **sidecar > embed** (D1): tokio nested runtime + crash isolation + release
  独立性の 3 理由。Sprint 32 で tokio runtime 共有化を試みる誘惑 (dep 数
  削減の誘惑) を予防的に却下。
- **monaco-languageclient 採用** (D2): 自前 client 実装は LSP capability
  セットの広さに対してコスト過大。Sprint 32 で "小さく自前実装から始める"
  段階的 roadmap は取らない。
- **tree-sitter-vba を両側 (frontend + verde-lsp 内部) に使う** (D3):
  grammar 単一 truth source 原則。Sprint 31 を frontend-only で終わらせず、
  Sprint 33 で verde-lsp parser swap まで履行することをコミット。
- **workbook-context は Sprint 34 まで空 fallback** (D4): LSP 段階的 rollout。
  Sprint 32 完了時点で "completion / hover / diagnostics は動くが Excel
  sheet/table 名認識は Sprint 34 以降" という中間状態を受容する durable 判断。
- **GitHub Releases artifact download** (D5): cargo workspace / git submodule /
  local build の 3 代替を却下済み。Sprint 32 / 34 で artifact 取得方針を
  再検討する場合は本 decision への反証 signal (verde-lsp release cycle
  停止、CI artifact 取得の chronic flakiness 等) が必要。
- **Sprint 33 は verde-lsp repo 側 sprint として実装**: verde-vba 側 plan.md
  は「verde-lsp v0.X.Y 依存更新」を記録するのみ。verde-lsp 側 plan.md / PLANS.md
  が Sprint 33 の TDD 詳細を持つ。cross-repo 進捗追跡手順は Sprint 31 Probes
  で確定予定。

## Follow-ups

- **Pause (2) exit 履歴 bullet 追加**: Sprint 31 以降で Pause (2) section
  (L424-504) を**書き換えず**、exit 履歴を durable 化するために以下の
  bullet を本ファイル内 Pause (2) section 末尾 (L502 `Pause 累積履歴の保全`
  直前) に追加する (Pause (1) L80-82 既定ルール踏襲、書き換えではなく追記):

  > **Pause (2) exited 2026-04-21 by Sprint 30** — 再開条件 (a) stakeholder
  > 明示的 PBI 投入 (`../verde-lsp, ../treesitter-vba の組込みに着手したい`)
  > により解除。Sprint 30-34 (LSP / treesitter 統合) に着地。Pause 宣言
  > (Sprint 29) から exit (Sprint 30) までの interval が短かったことは
  > Pause 構造が stakeholder signal 要求装置として機能した証として durable
  > 化。

  本 bullet 追加は Sprint 31 Probes executed と同時に実施 (本 Sprint 30
  docs で予め durable 化し、次 Sprint 冒頭 execute)。`[Due: Sprint 31
  Probes executed]` label 付与。

- **cross-repo progress tracking 手順確定** (KPT Try 繰り越し): Sprint 31
  Probes executed 時点で (i) "external dependency" 行の format、(ii) handoff.md
  経由の pointer、のいずれかを採択。`[Due: Sprint 31 Probes executed]` label。

- **preamble "Currently detailed" drift 再発防止**: Sprint 31 追加時に
  `28 / 29 / 30` → `29 / 30 / 31` 更新 + Sprint 28 index demotion を同
  commit で行う。Sprint 26 で確立した 3-sprint sliding window 手順の踏襲。

- **Sprint 31 Planning で treesitter WASM artifact 取得方針確定**:
  `tree-sitter-vba.wasm` を (i) CI artifact download、(ii) `tree-sitter build
  --wasm` を verde-vba 側 build step で実行、のどちらにするか決定。D5 の
  verde-lsp binary 取得方針 (CI artifact) との整合性を優先候補。

- **Sprint 32 Planning で verde-lsp release tag pinning 方針確定**:
  latest-stable 追随 vs version pin (例: `verde-lsp = "0.1.x"`) のどちらか。
  D5 の immutable artifact 前提と整合する pin 戦略を優先。

- **Sprint 33 開始は verde-lsp 側 Sprint として独立**: verde-vba plan.md は
  開始時に "Sprint 33 は verde-lsp 側 Sprint に委譲、verde-vba 側は
  verde-lsp vX.Y.Z 依存更新の commit のみ" と記録。

# Sprint 31 (2026-04-21) — Planning: Probes executed + WASM artifact 戦略 + cross-repo tracking 確定

## Goal

Sprint 30 で durable 化された 5-sprint 分割の筆頭実装 Sprint。Sprint 30
Follow-ups のうち `[Due: Sprint 31 Probes executed]` label 付き 2 件
(L620-638) を本 Sprint 冒頭で execute し、併せて Sprint 30 最後に保留した
`tree-sitter-vba.wasm` artifact 取得方針 (D5 の verde-lsp binary と並ぶ
sidecar artifact の 2 つ目) を durable 確定する。実装 (web-tree-sitter 導入
+ Monaco semantic tokens provider 置換) は本 Sprint の後続コミット、または
**前提条件 (treesitter-vba v0.1.0 tag 発行)** 成立後の Sprint 31.N として
段階的に履行する。

本 Sprint の Planning-only commit 1 回分は、Sprint 22 / 24 / 26 / 28 / 29 /
30 の Planning-only pattern を 7 回目として踏襲 (S30 は 6 回目)。

## Probes executed (Sprint start)

1. **baseline**: Rust 64 passed (on macOS host, `nix develop -c cargo test
   --lib --manifest-path src-tauri/Cargo.toml`) / Frontend 63 passed
   (`bun run test`, 10 test files) / Sprint 30 docs-only 以降コード変更ゼロ
   なので Sprint 27 実績と同一。本 Sprint も docs commit 1 のみの予定。
2. **bypass arc 再確認**: `rg '!\.' src/` → 0 hits (Sprint 15 以降不変) /
   `rg 'as\s+[A-Z]' src/ --type ts` → 1 hit (`src/lib/error-parse.test.ts:133`
   ガード付き正当 cast、保持) / `rg '@ts-ignore|@ts-expect-error' src/` → 0
   hits。Sprint 26 / 29 と同一、planner 単独の新 signal ゼロ。
3. **treesitter-vba sibling repo 確認**: `/Users/wagomu/dev/github.com/verde/
   treesitter-vba/` は grammar.js + queries (highlights/folds/indents/locals/
   textobjects) + `.github/workflows/release.yml` (WASM build + GitHub
   Releases attach on `v*` tag) が実装済み。**ただし tag 未発行** (`git tag
   -l` = 空)。bootstrap 問題として本 Sprint で方針確定。
4. **`scrum.ts` 不在確認**: Sprint 29 Probes 継承。plan.md が single source
   of truth、"Next Sprint Candidates" section 不該当。

## Sprint 30 Follow-up execute 1: cross-repo progress tracking 手順確定

Sprint 30 Try 項目 (L568-571) で繰り越された「sibling repo 3 つ横断の
progress tracking 手順」を本 Sprint で確定。候補 2 案のうち **(i) plan.md 内
"external dependency" 行を Sprint ごとに追加する方式** を採択。

**採択**: 各 Sprint section の冒頭 (`## Goal` 直後または ## External deps)
に以下 format で sibling repo 依存を明示。

```
## External dependencies (if any)

| Repo | Version/Tag | Commit | Status | 役割 |
|------|-------------|--------|--------|------|
| verde-lsp | v0.X.Y | <sha> | released / in-flight / pending | LSP sidecar binary |
| treesitter-vba | v0.X.Y | <sha> | released / in-flight / pending | Grammar WASM |
```

依存ゼロなら section 自体を省略。Sprint 本 31 では **treesitter-vba**
依存が "pending (v0.1.0 未発行)" として surface し、実装着手の gate 条件
として明示化される構造。

**却下**: (ii) handoff.md 経由の pointer。理由: verde/ トップの handoff.md
は tmux 巡回監視セッション運用 doc (handoff.md 先頭 80 行参照) であり、Sprint
progress tracking と目的が異なる。2 つの doc に情報を分散させるより、plan.md
で自己完結する方が参照が一箇所で済む。

**durable 根拠**: plan.md の `git log` + sprint tag が authoritative source
である plan-bloat policy (L5-19) と整合。Sprint ごとに "external dependency"
行が durable 化されれば、Sprint N+X で依存 version を更新する commit の
motivation も自動的に追跡可能。

## Sprint 30 Follow-up execute 2: treesitter-vba WASM artifact 取得方針確定

Sprint 30 Follow-ups (L586-589) で繰り越された `tree-sitter-vba.wasm`
取得戦略を本 Sprint で確定。

**採択**: **(i) CI artifact download from GitHub Releases** (D5 の
verde-lsp binary 取得戦略と同一 pattern)。treesitter-vba `release.yml` は
既に `v*` tag push で `tree-sitter-vba.wasm` を Release に attach する
workflow を持つ (`.github/workflows/release.yml:36-40`)。verde-vba 側は
CI build step (or Justfile recipe `fetch-wasm`) で以下 URL を download:

```
https://github.com/verde/treesitter-vba/releases/download/v0.X.Y/tree-sitter-vba.wasm
```

配置先: `public/tree-sitter-vba.wasm` (Vite の静的アセット経路; frontend は
`fetch('/tree-sitter-vba.wasm')` で load 可能)。`.gitignore` に追加し artifact
は commit しない (release cycle 独立性維持)。

**却下**: (ii) `tree-sitter build --wasm` を verde-vba 側 build step で
実行。理由: (a) emsdk 依存が Verde の `mise.toml` / `flake.nix` に新規追加
(マトリクス 2 → 3)、(b) 2 つの "VBA の真" (grammar.js と bundled WASM) の
version drift リスク、(c) verde-vba build 時間への影響 (emscripten build
は分単位)。D5 で却下された local build と同じ reasoning。

**durable 根拠**: D5 の 3 条件 (release cycle 独立 / CI 再現性 immutable /
Tauri 慣習と整合) が WASM artifact にも全て当てはまる。3 OS × 2 arch の
binary 分岐が無い (WASM は single artifact) 点で verde-lsp より simple。

**bootstrap 問題 (Sprint 31 実装 gate)**:

treesitter-vba は **tag 未発行**。実装 commit に進むには以下のいずれかが
必要:

- (a) stakeholder が treesitter-vba で `v0.1.0` tag を cut し GitHub
  Releases に WASM artifact が up する (release.yml が自動履行)
- (b) Sprint 31 を段階的に分割し、 artifact 非依存の準備コミット
  (characterization test / web-tree-sitter 導入 / Monaco semantic tokens
  provider 骨格の pure-test 可能部分) を先行させ、artifact 依存コミット
  (実 WASM load + token 生成) を gate (a) 成立後に行う

本 Sprint では **(b) 段階分割方針** を採択し、次節 "Sprint 31.N 実装
分割" で durable 化。

**dev 時 fallback**: `just fetch-wasm` recipe は GitHub Releases download
経路のみを提供し、unavailable 時は明示的 error を返す (local build への
silent fallback は提供しない)。Sprint 32 で同 recipe を verde-lsp binary
にも拡張 (`just fetch-lsp`)。

## Sprint 31.N 実装分割 (artifact 依存 gate 付き)

| ID | 内容 | 依存 | 実装 Sprint | 方針 |
|----|------|------|-------------|------|
| 31.A | 本 Planning commit (本節) | なし | Sprint 31 (本) | docs-only |
| 31.B | Monarch golden-string characterization test (現 `vbaTokensProvider` の出力を pin) | なし | Sprint 31 | Tidy First / artifact 非依存 / RED は無く pure characterization |
| 31.C | `web-tree-sitter` npm 依存追加 + `TreeSitterVbaProvider` skeleton (load 失敗時 fallback = Monarch) | 31.B | Sprint 31 | Tidy First (skeleton のみ、WASM load は stub) |
| 31.D | `tree-sitter-vba.wasm` artifact 配置 + `just fetch-wasm` recipe 追加 | treesitter-vba `v0.1.0` tag 発行 (外部 gate) | Sprint 31.D (gate 成立後) | CI workflow step + Justfile |
| 31.E | RED: 期待 semantic tokens 出力 test (`vbaTokensProvider` と異なる粒度で同一 token ストリームを表現する golden-string) | 31.D | Sprint 31.E | RED |
| 31.F | GREEN: Monaco `registerDocumentSemanticTokensProvider` 経由で treesitter-vba 出力を Monaco token に mapping | 31.E | Sprint 31.F | GREEN |
| 31.G | Tidy-after: Monarch `vbaTokensProvider` 削除 + fallback 経路整理 | 31.F | Sprint 31.G | Tidy-after / `monaco-vba.ts` を semantic tokens only に slim down |
| 31.H | docs: Sprint 31 retrospective + KPT + Follow-ups | 31.G | Sprint 31.H | docs |

**gate 管理**: 31.A-31.C は artifact 非依存で本セッションまたは次 planner
巡回で着手可能。31.D は treesitter-vba `v0.1.0` tag 発行を待つ (cross-repo
coordination signal)。gate 未成立で 31.E 以降に進む誘惑を予防的に却下
(Sprint 30 D3 の durable 根拠: grammar 単一 truth source 原則を Sprint 31
中に破らない)。

**Monarch fallback 経路** (31.C で実装、31.G で削除予定): WASM load 失敗
時の silent fallback は **Sprint 31.G で最終的に削除**。理由: Sprint 30
D3 で「Monarch と tree-sitter の 2 truth source を維持するコスト」を却下
済み。fallback を残置すると同コスト構造が復活するため。31.G 完了後は
WASM load 失敗 = editor エラー bar 表示 (現状 Sprint 3 で確立した
`Banner` コンポーネント流用) とし、installer / CI で artifact 配置を
検証する運用で対応。

## External dependencies

| Repo | Version/Tag | Commit | Status | 役割 |
|------|-------------|--------|--------|------|
| treesitter-vba | v0.1.0 | 5541daf | **released** (2026-04-21) — Sprint 31.D gate 成立; Release asset `tree-sitter-vba.wasm` attached via `release.yml` (run 24704457625). 0.26 locals-runner OOM により `tree-sitter test` smoke step は release pipeline から除去 (ci.yml 側は regression detector として残置、0.27 upgrade 時の re-enable signal) | Grammar WASM (`tree-sitter-vba.wasm`) |
| verde-lsp | (Sprint 32 以降) | — | not-yet-required | LSP sidecar binary |

## KPT

- **Keep**: Planning-only docs Sprint pattern を 7 回目として適用
  (Sprint 22 / 24 / 26 / 28 / 29 / 30 / 31)。Sprint 30 の 5 分岐 × 複数
  decision を 1 commit で閉じた前例を踏襲し、本 Sprint も WASM artifact
  戦略 + cross-repo tracking + 実装分割 を 1 commit で durable 化。
- **Problem**: Sprint 30 が予測した「**外部依存ありの初実装 Sprint**」は
  treesitter-vba tag 未発行という現実的 bootstrap 問題に直面。planner
  単独で tag 発行は不可能 (別 repo の release 権限)。Sprint 31.D の gate
  成立まで本 Sprint 実装進捗が部分的にブロックされる。
- **Try**: 31.A-31.C の artifact 非依存コミットを本セッション or 次巡回で
  先行履行し、31.D 以降は stakeholder signal (treesitter-vba tag 発行通知)
  を待つ。planner が treesitter-vba 側 session 6 に tag cut 依頼を投入する
  判断は、本 Sprint では **行わない** (silent probe 禁止原則、Pause (2)
  教訓の延長 — cross-repo action も stakeholder 明示指示を経る)。この
  境界判断自体を durable 化。

## 受け入れ基準

- Sprint 30 Follow-ups (L620-638) のうち `[Due: Sprint 31 Probes executed]`
  label 付き 2 件が本 commit で execute される ✅ (本 section)
- WASM artifact 取得方針が durable 確定 ✅ (D5 pattern 踏襲)
- Sprint 31.N 実装分割が durable 固定 ✅ (31.A-31.H table)
- preamble `Currently detailed` を `29 / 30 / 31` に更新 ✅
- Sprint 28 index demotion + 詳細 section 削除 ✅
- Pause (2) exit 履歴 bullet が Pause (2) section に追記されている (書き換え
  でなく追加) ✅
- `cargo test --lib` / `bun run test` / `bun run tsc --noEmit` / `cargo
  clippy --lib -- -D warnings` が Sprint 30 と同値 (64 / 63 / 0 / 0) — 本
  commit docs-only のため自動維持

## 変更コミット

| Commit | 内容 |
|--------|------|
| (本 docs) | Sprint 31 Planning section 追加 (Probes + cross-repo tracking + WASM artifact 戦略 + 31.A-31.H 実装分割) + preamble `28 / 29 / 30` → `29 / 30 / 31` + Sprint 28 index demotion + index 見出し `Sprint 3–27` → `Sprint 3–28` + Pause (2) exit bullet 追記 |

## Key decisions (durable; Sprint 31.N+ での蒸し返し禁止)

- **cross-repo tracking = plan.md 内 "External dependencies" table**: Sprint
  ごとに sibling repo 依存を明示。handoff.md 併用却下の理由は parallel
  doc 分散による参照コスト増。Sprint 32-34 でも同 format 維持。
- **WASM artifact = CI download only, 2 方式 (local build / submodule)
  却下**: D5 の verde-lsp binary 取得戦略と同根拠。次 Sprint 以降で
  emsdk 導入の誘惑が出た場合、本 decision への反証 signal (release cycle
  停止、CI artifact 取得の chronic flakiness) を求める。
- **Monarch fallback 経路は 31.C で一時導入 → 31.G で削除**: Sprint 30 D3
  の grammar 単一 truth source 原則を Sprint 31 中盤で崩さないための予防
  decision。31.C-31.F の中間状態 (fallback あり) を permanent 化しない。
- **cross-repo tag cut の依頼投入は planner 権限外**: Sprint 31.D gate
  成立は stakeholder 明示指示経由のみ。Pause (2) 教訓 (silent probe 禁止)
  を cross-repo action にも拡張適用する境界判断を durable 化。

## Follow-ups

- **`[Due: Sprint 31 実装進捗 checkpoint]` 31.A 完了後の 31.B-31.C 着手**:
  Monarch characterization test (31.B) と web-tree-sitter 導入 (31.C) を
  本 Planning commit 後の独立コミットとして履行。artifact 非依存のため
  本セッション内で連続履行可能。
- **`[Due: treesitter-vba v0.1.0 tag 発行後]` 31.D-31.H 実装**: tag 発行
  signal を待って再開。signal 到着確認は Sprint 31.B/C 完了後の planner
  巡回時に `git ls-remote --tags ../treesitter-vba` で自動化可能。
- **preamble "Currently detailed" drift 再発防止**: Sprint 32 追加時に
  `29 / 30 / 31` → `30 / 31 / 32` 更新 + Sprint 29 index demotion を同
  commit で行う。Sprint 26 で確立した 3-sprint sliding window 手順の踏襲。
- **Sprint 32 Planning で D5 recipe 名 (`just fetch-lsp` / `just fetch-wasm`)
  の共通化判断**: 現時点では個別名で独立、rule-of-three 到達 (第 3 の
  外部 artifact 追加 Sprint 34 以降) で `just fetch-artifacts` 統合を再評価。
  Sprint 31 の単発 `just fetch-wasm` で rule-of-two までに留める。

## Sprint 31.B-31.G Execution Retrospective (2026-04-21)

Planning commit (31.A) で durable 化した 31.A-31.H 実装分割を、
treesitter-vba `v0.1.0` tag 発行 (gate 成立) を確認後、本セッション内で
連続履行。31.B-31.G を 4 commits + 1 docs commit (本節) で完了:

| Commit  | Sprint | 内容                                                           |
|---------|--------|----------------------------------------------------------------|
| `d91d49f` | 31.B   | Monarch grammar の characterization test pin (Tidy First)       |
| `6ccd6cb` | 31.C   | `web-tree-sitter` 依存追加 + load skeleton                       |
| `85b61c6` | 31.D-gate | treesitter-vba v0.1.0 gate cleared (docs)                    |
| `95cbcb1` | 31.D   | `just fetch-wasm` recipe + CI step + `.gitignore` 追加          |
| `74ae58f` | 31.E   | RED: real-WASM 駆動 semantic-tokens 期待値 (5 tests, all FAIL) |
| `de907ea` | 31.F   | GREEN: `provideDocumentSemanticTokens` 実装 + Editor 配線         |
| `604fe56` | 31.G   | Tidy after: Monarch grammar + fallback 削除 (-139 lines)        |
| (本 docs) | 31.H   | 本 retrospective                                                |

### Probe / DoD 結果 (本 commit 直前)

- Backend: `cargo test --lib` → 64 passed (Sprint 30 と同値、今 Sprint
  Rust コード変更ゼロ)
- Backend: `cargo clippy --lib -- -D warnings` → 0 warnings
- Frontend: `bun run test` → **82 passed (13 files)**
  - Sprint 30 baseline 63 → 31.B で +6 (monaco-vba 6) → 31.C で +14
    (tree-sitter-vba 14) → 31.E で +5 (semantic 5) → 31.F で 0 (test
    削除なし) → 31.G で -6 (Monarch 削除に伴う 6 件削除) = 82 ✓
- Frontend: `bun run tsc --noEmit` → 0 errors
- Frontend: `bun run lint` → 0 warnings

### KPT (執行フェーズ)

- **Keep**: gate 待ち想定だった 31.D-31.H が **同一セッション内で連続履行
  可能**だったのは、Sprint 31 Planning で artifact 取得方針を `(b) 段階分割`
  に確定していたから。Planning commit が gate 成立後の execute 経路を予め
  durable 化していたことで「待ちか進むか」の判断コストがゼロだった。
- **Keep**: Sprint 31.E の RED test を `tree-sitter-vba.semantic.test.ts`
  という別ファイルに分離した判断。31.C の skeleton 単体テスト
  (`tree-sitter-vba.test.ts`) と integration test の関心を分けたことで、
  31.G で Monarch を削除する際にどのテストを残し / どれを消すかの判断が
  ファイル境界で済んだ。
- **Problem**: jsdom の `globalThis.Uint8Array` が Node の `Buffer` と
  prototype 不一致で `Language.load(buffer)` が `instanceof Uint8Array`
  分岐を取り損ねた。`new Uint8Array(buf.buffer, buf.byteOffset,
  buf.byteLength)` で wrap して回避。本知見は web-tree-sitter v0.26 +
  vitest+jsdom の組合わせ固有。upstream で改善されれば不要になる workaround。
- **Problem**: tree-sitter-vba grammar が `(identifier)` 等の named node
  に **leading whitespace** を含む場合がある (`Sub Foo()` の "Foo" が
  cols 3-7 で text " Foo")。`trimmedExtent` helper で trim する mapping
  処理を追加して対応 (再発防止のため `tree-sitter-vba.semantic.test.ts`
  の "trims leading whitespace" テストで invariant 化済み)。
- **Try (Sprint 32 へ)**: 上記 jsdom Uint8Array workaround は同一 pattern
  が verde-lsp WASM (もし WASM 配信になる) や他の WASM artifact 統合時にも
  再発しうる。`src/lib/wasm-loader.ts` のような共通ヘルパー化を検討
  (rule-of-two: tree-sitter-vba が現在唯一の WASM、verde-lsp は binary
  予定なので rule-of-three 未到達)。Sprint 32+ で第 2 の WASM 出現時に再評価。
- **Try (Sprint 32 へ)**: `provideDocumentSemanticTokens` の per-call parse
  はキャッシュなし。10000+ 行の large module で重複 parse コストが
  目立つかをパフォーマンス計測 PBI として Sprint 32 の F4 trigger 候補に登録。

### Key decisions reaffirm (durable; Sprint 32+ での蒸し返し禁止)

- **Sprint 31.G の Monarch 完全削除は durable**: 31.G 実装後にユーザから
  「Monarch を残しておけば...」の signal が来た場合、Sprint 30 D3
  (grammar 単一 truth source) を提示し却下根拠とする。Sprint 31 中盤の
  fallback 経路 (31.C-31.F の中間状態) を permanent 化しない判断は予定
  どおり履行された。
- **Sprint 31.D `just fetch-wasm` は単独 recipe で維持**: 共通化
  (`just fetch-artifacts`) は rule-of-three 到達 (Sprint 34 以降) で再評価。
- **Editor.tsx → App.tsx の `onTreeSitterLoadError` callback 経路** (本
  Sprint で新規追加) は、将来 LSP load 失敗にも同 pattern を踏襲する候補。
  Sprint 32 で verde-lsp 配線時に `onLspLoadError` を別 prop で追加するか、
  両者を `onGrammarServiceError({ kind: "tree-sitter" | "lsp" })` に
  統合するかは Sprint 32 で判断 (rule-of-two)。

### Updated Follow-ups (Sprint 32 Planning で消化)

- **(消化済)** `[Due: Sprint 31 実装進捗 checkpoint]` 31.B-31.C 着手 →
  本 Sprint 内で履行 (commits `d91d49f`, `6ccd6cb`)
- **(消化済)** `[Due: treesitter-vba v0.1.0 tag 発行後]` 31.D-31.H 実装 →
  本 Sprint 内で履行 (commits `95cbcb1`, `74ae58f`, `de907ea`, 本 docs)
- **`[Due: Sprint 32 Planning]` 大規模ファイルの semantic-tokens 性能計測
  PBI 登録**: 上記 Try より転記。F4 trigger 候補として Sprint 32 Probes で
  re-evaluation。
- **`[Due: 第 2 WASM artifact 追加時]` jsdom `Uint8Array` workaround の
  共通ヘルパー化**: 上記 Try より転記。rule-of-two 維持、第 2 出現時に判断。
- **`[Due: Sprint 32 Planning, 不変]` preamble "Currently detailed" drift
  防止**: `29 / 30 / 31` → `30 / 31 / 32` 更新 + Sprint 29 index demotion。
- **`[Due: Sprint 32 verde-lsp 配線時]` `onTreeSitterLoadError` /
  `onLspLoadError` 統合判断**: 上記 Key decisions の延長。

# Sprint 32 (2026-04-21) — Planning: LSP sidecar 配線設計 + 32.N 実装分割 + bypass arc regression 検知

## Goal

Sprint 30 で durable 化された 5-sprint 分割 (L484-490) の 2 つ目の実装
Sprint (Sprint 31 が treesitter-vba 統合、本 Sprint 32 が verde-lsp 統合)。
Sprint 30 D1 (Tauri sidecar binary) / D2 (monaco-languageclient + IPC
bridge) / D5 (GitHub Releases artifact download) の **concrete wiring
設計**を durable 化し、**verde-lsp semver tag 未発行**という Sprint 31.D と
同 bootstrap 問題に対して 32.N 実装分割方針を固定する。併せて本 Sprint
Probes で検出した **bypass arc regression** (Sprint 31.F GREEN 実装で
`parser!` / `query!` 2 件が `src/lib/tree-sitter-vba.ts:242,245` に混入、
Sprint 15 以降 durable だった 0-hit invariant を違反) を 32.B Tidy First
として先行履行。Sprint 22 / 24 / 26 / 28 / 29 / 30 / 31 の Planning-only
docs Sprint pattern を **8 回目**として踏襲。

## External dependencies

| Repo | Version/Tag | Commit | Status | 役割 |
|------|-------------|--------|--------|------|
| verde-lsp | v0.X.Y | — | **pending** (semver tag 未発行、GitHub Releases 空 `gh release list --repo verde-vba/verde-lsp` 結果; 内部 sprint tag sprint-9..54 は release cycle と独立運用) — Sprint 32.E gate 条件 | LSP sidecar binary (`verde-lsp-windows.exe` / `verde-lsp-linux` / `verde-lsp-macos` per verde-lsp `.github/workflows/release.yml`) |
| treesitter-vba | v0.1.0 | 5541daf | released (Sprint 31.D で配信開始、本 Sprint 32 では no-op 状態) | Grammar WASM (`tree-sitter-vba.wasm`) |

Sprint 31 で新規採用した External dependencies table format を本 Sprint で
2 回目運用 (rule-of-two)。Sprint 32 は 2 row (verde-lsp pending + treesitter-vba
released) となり、Sprint 31 Key decision (L787-789) で durable 化された
「Sprint 32-34 でも同 format 維持」を履行。

## Probes executed (Sprint start)

1. **baseline**: Rust 64 passed (`nix develop -c cargo test --lib
   --manifest-path src-tauri/Cargo.toml`) / Frontend 82 passed (`bun run
   test`, 13 files) / `bun run tsc --noEmit` → 0 errors / `cargo clippy
   --lib -- -D warnings` → 0 warnings / `bun run lint` (eslint) → 0
   warnings。Sprint 31.H 完了時点 (`db3be8b`) と全て同値、Sprint 31 以降
   コード変更ゼロを確認。
2. **bypass arc regression 検知** (**新 signal**): `rg '!\.' src/` → **2
   hits** (`src/lib/tree-sitter-vba.ts:242` `parser!.parse(source)` / `:245`
   `query!.captures(tree.rootNode)`)。Sprint 15 以降 durable だった 0-hit
   invariant が Sprint 31.F GREEN の `provideDocumentSemanticTokens` 実装
   (`createVbaSemanticTokensProvider`) で崩れた。`ensureInit()` が
   `parser: Parser | null` / `query: Query | null` の両変数を初期化する
   control flow に対して TS の type narrowing が効かず `!` で抜けた形。
   これは **Sprint 15 arc closure 以来の regression 第 1 号**。本 Sprint
   32.B で Tidy First として修正 (`ensureInit()` を「初期化済み pair を
   返す関数」に改名し narrowing 効果を復活させる pattern、詳細は 32.B
   commit で RED-less pure refactor として履行)。
3. **`rg 'as\s+[A-Z]' src/ --type ts`**: 3 hits (`tree-sitter-vba.test.ts`
   × 2 + `tree-sitter-vba.semantic.test.ts` × 1)。いずれも test 境界での
   `{} as Language` / `cancel as unknown as Parameters<...>[2]` で Sprint
   31 で新規追加された正当 cast。Sprint 32 以降も保持方針 (test 境界の
   Monaco/tree-sitter 型整合は production コード側には漏出しない)。`rg
   '@ts-ignore|@ts-expect-error' src/` → 0 hits 継続。
4. **verde-lsp sibling repo 状態確認**: `/Users/wagomu/dev/github.com/verde/
   verde-lsp/` は成熟 stdio LSP server (148 tests + Windows CI、内部 sprint-54
   `5c9eae0` まで進捗)。`git tag -l 'v*'` → **空**、`gh release list --repo
   verde-vba/verde-lsp` → **空**。release pipeline (`.github/workflows/
   release.yml`) は `v*` tag push で triggered、3 OS (windows-latest /
   ubuntu-latest / macos-latest) × asset (`verde-lsp-windows.exe` /
   `verde-lsp-linux` / `verde-lsp-macos`) を生成。Sprint 31.D の treesitter-vba
   状況と同じ bootstrap 問題を構成。Sprint 31 Key decision (L797-799)
   「cross-repo tag cut の依頼投入は planner 権限外」を本 Sprint でも
   durable 踏襲、gate 成立は stakeholder 明示指示のみ。

## Sprint 30 / 31 Follow-up execute

### Execute 1: preamble "Currently detailed" drift 防止 + Sprint 29 index demotion
Sprint 31 Follow-ups (L903-904) で durable 化された「`29 / 30 / 31` → `30 /
31 / 32` 更新 + Sprint 29 index demotion」を本 Planning commit で履行。
Sprint 26 で確立した 3-sprint sliding window 手順の **4 回目適用**
(Sprint 27 demotion in S30 / 28 in S31 / 29 in S32)。Sprint 29 detail
section は **Pause (2) standalone section 切り出し + index row への
折り畳み** で二重保全 (Pause 関連 durable content は失われない、L80+
「Intentional Pause (2) — 終了記録」section 参照)。

### Execute 2: `onTreeSitterLoadError` / `onLspLoadError` 統合判断 (rule-of-two)
Sprint 31 Follow-ups (L905-906) の Sprint 32 判断事項。**本 Sprint 32 では
rule-of-two 維持、統合 skip** を durable 化。根拠:
- Sprint 31 で導入された `onTreeSitterLoadError` は **load-time failure**
  (WASM download / init / `Language.load` の失敗) を扱う (`registerTreeSitter
  VbaProvider` 内 `options.onError?.(result)` 経路、`tree-sitter-vba.ts:217`)
- Sprint 32 で導入予定の `onLspLoadError` は **runtime failure** の性格が
  強い (sidecar spawn 失敗 + stdio パイプ切断 + LSP handshake timeout +
  request/response deadlock 等)、recovery 戦略も異なる (retry / restart /
  partial degradation to tree-sitter-only)
- 2 surface の user-facing message は superficial に似る ("grammar service
  が動いていません") が、内部状態 machine が異なるため統合 callback は
  情報を圧縮しすぎる (restart 可否 / retry 回数 / LSP-only vs WASM-only
  degradation 経路の差異)
- 第 3 の artifact/service-based failure surface (例: Sprint 34
  workbook-context export 失敗) は **PowerShell COM error** であり artifact
  failure ではない → rule-of-three tipping point は Sprint 34 で自動到達
  しない。Sprint 35+ 未知 surface で再評価
- Sprint 32 実装中は `onLspLoadError` を Editor.tsx の **別 prop** として
  追加 (32.G / 32.H)。Sprint 31 で確立した `onTreeSitterLoadError` prop
  pattern (Editor.tsx → App.tsx callback) を踏襲

### Execute 3: 大規模ファイル semantic-tokens 性能計測 PBI 転記
Sprint 31 Follow-ups (L898-900) で Sprint 32 F4 trigger 候補に登録された
項目。本 Sprint Probes で **stakeholder 性能問題報告ゼロ** + **10000+ 行
real-world VBA module の実測ゼロ**。Sprint 29 の F1-F4 trigger 運用と同じく
「**未成立**」判定し、**Sprint 32+ の F5 候補**として繰り越す。trigger
条件は前提どおり「stakeholder から 10000+ 行 module での体感遅延報告 /
macOS host で `provideDocumentSemanticTokens` が 500ms+ の実測」を固定。
`tree-sitter-vba.ts` の per-call `parser.parse(source)` は caching なし
(同 ts file L242 参照、本 Sprint で bypass arc 修正 commit 後も構造は維持)。
将来的な cache layer 追加は F5 trigger 成立後の Sprint で評価。

### Execute 4: jsdom `Uint8Array` workaround 共通ヘルパー化 skip
Sprint 31 Follow-ups (L901-902) の rule-of-two 維持方針を本 Sprint で durable
reaffirm。Sprint 32 は **verde-lsp binary (native sidecar、WASM ではない)**
統合なので WASM artifact は依然 tree-sitter-vba のみ (rule-of-one 事実上)。
Sprint 33 (verde-lsp 内部 parser swap、Sprint 30 L487 で verde-lsp repo 側
Sprint として実装方針確定) / Sprint 34 (workbook-context export、PowerShell
COM) も WASM artifact 追加予定なし。**Sprint 32-34 を通して rule-of-two
継続** の durable 判断、`src/lib/wasm-loader.ts` 共通化は Sprint 35+ の
第 2 WASM artifact 出現時に再評価。

## LSP wiring 具体設計 (Sprint 30 D1 / D2 / D5 の concrete realization)

### D1 具体化: Tauri sidecar 起動経路

- **Plugin**: `tauri-plugin-shell` (Tauri v2 標準 plugin) の `Command::
  sidecar()` API を使用。新規 Rust 依存 1 件追加 (`Cargo.toml`)
- **配置規約**: `src-tauri/binaries/verde-lsp-<target-triple>` (Tauri
  慣習)。target triple は `aarch64-apple-darwin` / `x86_64-apple-darwin` /
  `x86_64-pc-windows-msvc` / `x86_64-unknown-linux-gnu`
- **stdio パイプ**: `Command::spawn()` の返す child handle で stdin/stdout
  を確保、stdin 書き込みは Tauri command、stdout forwarding は spawn した
  async task が行を読んで Tauri event `lsp://message` を `emit`
- **crash detection**: child process exit を child handle の exit future で
  await、event `lsp://exit` を emit。frontend 側は `onLspLoadError` (Execute
  2 で rule-of-two 別 prop 維持決定) を起動
- **tauri.conf.json**: `plugins.shell.sidecar = ["binaries/verde-lsp"]` 追加
  (32.D で着手)。Tauri bundler がビルド時に sidecar binary を包摂

### D2 具体化: monaco-languageclient + IPC bridge

- **npm 依存**: `monaco-languageclient`, `vscode-jsonrpc`, `vscode-language
  server-protocol` (`monaco-languageclient` peer deps)。Sprint 31 の
  `web-tree-sitter` 追加と同手順で `package.json` / `bun.lockb` 更新
- **`src/lib/lsp-bridge.ts`** (新規): `vscode-jsonrpc` の `MessageConnection`
  を Tauri IPC にブリッジ
  - outbound: `invoke('lsp_send', { message })` で Rust 側 stdin に渡す
  - inbound: `listen('lsp://message', handler)` で Rust 側 stdout を受け取る
  - pure-test 可能部 (message encode/decode) を 32.C で先行 TDD。IPC 部分
    (`invoke` / `listen`) は Tauri mock で characterize
- **`src/hooks/useLspClient.ts`** (新規): `MonacoLanguageClient` lifecycle
  管理 (start/stop + restart on error)。Sprint 31 で導入された `useTheme` /
  `useLocale` pattern と同じ hook 経路
- **LSP capabilities**: verde-lsp 側の `server_capabilities` に委譲
  (completion / hover / diagnostics / rename / code action / signature help
  / document symbol / workspace symbol / references / document highlight /
  call hierarchy / folding range / inlay hint / formatting の 14 種、
  verde-lsp sprint-54 時点実装済み)。verde-vba 側 client capabilities は
  minimal (semantic tokens は Sprint 31 の tree-sitter 側で継続)

### D5 具体化: artifact 取得 pipeline

- **`just fetch-lsp` recipe** (Sprint 31 `just fetch-wasm` pattern 踏襲):
  ```
  https://github.com/verde-vba/verde-lsp/releases/download/v0.X.Y/verde-lsp-<asset>
  ```
  - platform-specific に download (`verde-lsp-windows.exe` / `-linux` / `-macos`)
  - 配置先: `src-tauri/binaries/verde-lsp-<target-triple>` (Tauri sidecar
    規約、Sprint 31 の `public/tree-sitter-vba.wasm` とは別経路)
  - `.gitignore` に `src-tauri/binaries/verde-lsp*` を追加
- **SHA256 verify**: **初期実装ではスキップ** (Sprint 31 の `just
  fetch-wasm` と同水準)。rule-of-two で SHA256 verify 共通化の rule-of-three
  到達時に `just fetch-artifacts` 統合とあわせて検討
- **CI workflow step**: verde-vba release build 時に同 URL から download、
  Tauri bundler が sidecar として包摂。treesitter-vba artifact download step
  (Sprint 31.D で追加) と並ぶ並列 step として配線

## Sprint 32.N 実装分割 (artifact 依存 gate 付き)

| ID | 内容 | 依存 | 実装 Sprint | 方針 |
|----|------|------|-------------|------|
| 32.A | 本 Planning commit (本 section) | なし | Sprint 32 (本) | docs-only |
| 32.B | Tidy First: `parser!` / `query!` bypass arc regression 修正 (tree-sitter-vba.ts:242,245) — `ensureInit()` を「初期化済み pair を返す関数」に改名 + type narrowing 復活 | なし | Sprint 32 | Tidy First / Sprint 15 arc closure 原則回復 / tests 82 維持 |
| 32.C | `monaco-languageclient` + `vscode-jsonrpc` npm 依存追加 + `src/lib/lsp-bridge.ts` skeleton (pure-test 可能部のみ: message encode/decode + Tauri mock) | なし | Sprint 32 | Tidy First / artifact 非依存 / tests +N |
| 32.D | `tauri-plugin-shell` 依存追加 + Rust 側 `lsp_send` command + `lsp://message` / `lsp://exit` event stub (sidecar spawn 抜き、stub 返り値のみ) + `tauri.conf.json` sidecar 宣言 + `src-tauri/binaries/.gitkeep` | なし | Sprint 32 | Tidy First / artifact 非依存 |
| 32.E | `just fetch-lsp` recipe + CI step + `.gitignore` 追加 + Justfile recipe integration-test (curl mock 相当) | **verde-lsp `v0.X.Y` tag 発行** (外部 gate) | Sprint 32.E (gate 成立後) | Sprint 31.D pattern 踏襲 |
| 32.F | RED: LSP `initialize` request 往復の期待 response test (fake LSP server で characterize) + Editor.tsx `onLspLoadError` 経路の RED | 32.E | Sprint 32.F | RED |
| 32.G | GREEN: sidecar spawn + stdin/stdout async wire + MonacoLanguageClient 起動 + Editor.tsx 配線 + `useLspClient` hook | 32.F | Sprint 32.G | GREEN |
| 32.H | Tidy-after: completion / hover / diagnostics の小型 golden-string test 追加 + `onTreeSitterLoadError` / `onLspLoadError` の Editor.tsx prop 整理 (統合 skip、別 prop 維持が durable — Execute 2 決定履行) | 32.G | Sprint 32.H | Tidy-after |
| 32.I | docs: Sprint 32 retrospective (Sprint 31.H 踏襲 / bypass arc probe を DoD checklist 化) | 32.H | Sprint 32.I | docs |

**gate 管理** (Sprint 31 pattern 踏襲): 32.A / 32.B / 32.C / 32.D は artifact
非依存、本セッションまたは次巡回で連続履行可能。32.E は **verde-lsp v0.X.Y
tag 発行を待つ** (cross-repo coordination signal)。gate 未成立で 32.F 以降に
進む誘惑を予防的に却下 (Sprint 30 D1 の durable 根拠: stdio E2E test 資産を
verde-lsp 側 148 tests でカバーする前提が崩れる)。cross-repo tag cut 依頼
投入は planner 権限外 (Sprint 31 Key decision L797-799)。

## KPT

- **Keep**: Planning-only docs Sprint pattern を **8 回目**として適用
  (Sprint 22 / 24 / 26 / 28 / 29 / 30 / 31 / 32)。Sprint 31 で実証された
  「**Planning commit が gate 成立後の execute 経路を durable 化することで、
  待ちか進むかの判断コストゼロ**」(L849-852) を LSP 統合にも適用。Sprint
  31.A で 31.B-31.H の全体像を予め確定したので tag 発行通知後に即座に連続
  履行できた pattern を 32.A でも再現。Sprint 30 D1-D5 の **高密度前倒し
  Planning** (5-sprint 分 × 複数 decision を 1 commit で固定) の美点が Sprint
  31 の低判断コストに反映された事実を Sprint 32 でも活用。
- **Problem**: Probes 2 で **bypass arc regression** (`parser!` / `query!`
  2 件) を検知。Sprint 31 Probes (L621) で「`rg '!\.' src/` → 0 hits
  (Sprint 15 以降不変)」を durable 化した同 Sprint 31.F の GREEN 実装で
  invariant 違反を混入。これは Sprint 15 以来の regression 第 1 号であり、
  **Sprint 31.H retrospective で bypass arc probe が明示 DoD checklist に
  入っていなかった**ことが直接原因 (L835-846 の DoD 結果は test 数 / clippy
  / tsc / lint のみを確認)。
- **Try**: 今後の実装 Sprint retrospective DoD に **bypass arc probe
  (`rg '!\.' src/` / `rg 'as\s+[A-Z]' src/ --type ts` / `rg '@ts-ignore|@ts
  -expect-error' src/`)** を明示的 checklist として追加、`[Due: Sprint
  32.I retrospective]` 以降固定。Sprint 18 の checklist 追加 pattern
  (Sprint 15 post-sprint probe 追加) と同根、各実装 Sprint の retrospective
  で bypass arc の「新規 regression ゼロ」を明示確認する DoD 化。

## 受け入れ基準

- Sprint 30 / 31 Follow-ups 4 件が本 commit で execute される ✅ (Execute 1-4)
- verde-lsp / treesitter-vba の External dependencies table が本 Sprint
  section 冒頭に記録 ✅
- D1/D2/D5 の concrete wiring 設計が durable 固定 ✅
- Sprint 32.N 実装分割が durable 固定 (32.A-32.I) ✅
- preamble `Currently detailed` を `30 / 31 / 32` に更新 + Sprint 29 demotion
  note 追加 ✅
- Pause (2) 終了記録 section が Pause (1) 直後に standalone として切り出し
  (書き換えでなく累積追加) ✅
- index 見出し `Sprint 3–28` → `Sprint 3–29` ✅
- Sprint 29 index row が `Sprint 3–29 summary index` に追加 ✅
- 既存「Sprint 26 / 27 / 28 — (index row に折り畳み済み)」section header が
  Sprint 29 を含む形に更新 + Sprint 29 demotion pointer 追加 ✅
- `cargo test --lib` / `bun run test` / `bun run tsc --noEmit` / `cargo
  clippy --lib -- -D warnings` / `bun run lint` が Sprint 31.H と同値
  (64 / 82 / 0 / 0 / 0) — 本 commit docs-only のため自動維持

## 変更コミット

| Commit | 内容 |
|--------|------|
| (本 docs) | Sprint 32 Planning section 追加 (Probes + External deps + Sprint 30/31 Follow-up execute 4 件 + D1/D2/D5 具体化 + 32.A-32.I 実装分割 + KPT) + preamble `29 / 30 / 31` → `30 / 31 / 32` + Sprint 29 index demotion + Pause (2) 終了記録 section 切り出し + index 見出し `Sprint 3–28` → `Sprint 3–29` |

## Key decisions (durable; Sprint 32.N+ / Sprint 33+ での蒸し返し禁止)

- **bypass arc regression は次 Sprint 以降の Tidy First 冒頭で修正する
  pattern**: Sprint 32.B で `parser!` / `query!` を修正する際に採用する
  「`ensureInit()` を初期化済み pair を返す関数に改名し type narrowing
  を復活させる」アプローチを標準化。同 pattern が Sprint 33+ で再発した
  場合 (verde-lsp 内部 parser swap や workbook-context コード等) の対応
  経路。`!\.` は Sprint 15 以降 **0-hit を durable invariant** として
  維持。
- **`onTreeSitterLoadError` と `onLspLoadError` は別 prop 維持 (rule-of-two)**:
  統合 callback への昇格は第 3 の artifact/service-based failure surface で
  再評価。Sprint 34 workbook-context export failure は PowerShell COM error
  で artifact-based ではない → Sprint 35+ 未知 surface が rule-of-three
  tipping point。Sprint 32 実装中に統合の誘惑が出ても却下根拠は「load-time
  vs runtime failure + recovery 戦略差異」を提示。
- **`just fetch-lsp` と `just fetch-wasm` の共通化 skip (rule-of-two)**:
  Sprint 31 L814-816 で durable 化済み判断を Sprint 32 でも維持。Sprint 34
  workbook-context は PowerShell COM export で **外部 artifact ではない** →
  Sprint 32-34 を通して rule-of-two 継続確定。rule-of-three 到達 = 第 3 の
  外部 artifact 追加 Sprint (現時点で surface せず) で `just fetch-artifacts`
  統合を検討。
- **monaco-languageclient + vscode-jsonrpc 採用は D2 再確認**: Sprint 30 D2
  (L385-398) と同根拠。自前 LSP client 実装は Sprint 32.C で誘惑が出ても
  却下 (verde-lsp の 14 LSP capabilities 広さへの対応コスト過大)。
- **Pause (2) 終了記録は Pause (1) と並ぶ standalone section**: Pause (1)
  L80-82 既定ルール踏襲、書き換えではなく追加方式。Pause 履歴の累積
  (Pause (3) 発生時も同 pattern で本ファイル内追記)。
- **Sprint 29 detail demotion の sliding window housekeeping**: Sprint 31
  Follow-ups (L903-904) の指示を本 Sprint で execute。3-sprint sliding
  window を堅持 (`30 / 31 / 32` detailed; Sprint 29 は index row + Pause (2)
  standalone section の二重保全へ折り畳み)。Sprint 29 の durable content
  (Pause (2) 宣言 + passive 滞留 → Pause escalate 手続き + Pause 累積履歴
  管理ルール) は 3 重保全 ((i) index row 本文 (ii) Pause (2) 終了記録
  section (iii) `git show` by `git log --oneline | grep 29`) で情報欠損なし。

## Follow-ups

- **`[Due: Sprint 32 実装進捗 checkpoint, artifact 非依存]` 32.B-32.D 着手**:
  bypass arc regression 修正 (32.B) + monaco-languageclient 依存 + lsp-bridge
  skeleton (32.C) + tauri-plugin-shell 依存 + backend stub (32.D) を本
  Planning commit 後の独立コミットとして履行。artifact 非依存のため本
  セッション内で連続履行可能、Sprint 31 の 31.B-31.C 連続履行 pattern
  (commits `d91d49f` / `6ccd6cb`) 踏襲。
- **`[Due: verde-lsp v0.X.Y tag 発行後]` 32.E-32.I 実装**: tag 発行 signal
  を待って再開。signal 到着確認は Sprint 32.B-D 完了後の planner 巡回時に
  `git ls-remote --tags ../verde-lsp | grep -E 'v[0-9]'` で自動化可能
  (Sprint 31 pattern 踏襲、Sprint 31.D-gate commit `85b61c6` と同 pattern)。
- **`[Due: Sprint 32.I retrospective 及び以降の実装 Sprint retrospective]`
  bypass arc probe を DoD checklist に固定**: 上記 KPT Try より転記。
  retrospective で必ず `rg '!\.' src/` / `rg 'as\s+[A-Z]' src/ --type ts` /
  `rg '@ts-ignore|@ts-expect-error' src/` を実行し、「新規 regression ゼロ」
  または「新規 hit の justification」を明示記録。Sprint 33+ の実装 Sprint
  でも継承。
- **`[Due: Sprint 33 Planning, 不変]` preamble "Currently detailed" drift
  防止**: Sprint 33 追加時に `30 / 31 / 32` → `31 / 32 / 33` 更新 + Sprint
  30 index demotion を同 commit で行う。Sprint 26 で確立した 3-sprint
  sliding window 手順の踏襲 (**Sprint 33 は verde-lsp 側 Sprint として実装**
  (Sprint 30 L555-558) なので verde-vba plan.md 側は依存更新 commit のみの
  可能性。その場合 Sprint 33 の "demotable" detail 量が少ないため、Sprint 33
  Planning で **cross-repo Sprint の sliding window 運用** (例: "依存更新
  commit Sprint" を detail slot に計上するか否か) を durable 確定要)。
- **`[Due: 第 3 artifact-based service failure surface]` `onGrammarService
  Error` 統合再評価**: 上記 Execute 2 で rule-of-three 条件を明示。Sprint 34
  workbook-context export failure は PowerShell COM error で artifact-based
  ではない → Sprint 34 で automatic trigger 成立の可能性は低い。Sprint 35+
  の未知 surface が rule-of-three tipping point。
- **`[Due: stakeholder 性能問題報告 / 10000+ 行 module 実測時]` F5 semantic-
  tokens 性能計測 PBI**: Sprint 31 Follow-up (L898-900) から Sprint 32
  Execute 3 経由で F5 格上げ。trigger 条件 "stakeholder から 10000+ 行
  module の体感遅延報告 / macOS host で 500ms+ 実測" を durable 固定、
  cache layer 導入の PBI 化は trigger 成立後の Sprint で。
- **`[Due: 第 2 WASM artifact 出現時]` jsdom `Uint8Array` workaround 共通
  ヘルパー化**: Sprint 31 Follow-up (L901-902) から継承、Execute 4 で
  Sprint 32-34 rule-of-two 継続確定 (Sprint 35+ に回送)。

# Commit discipline notes

Sprint retrospective の Try 項目のうち、**standing convention** に格上げされた
commit-time ルールを durable 化するセクション。Sprint を跨いで同じ try が
再登場した / 明示的に決定されたルールのみをここに記録する。Sprint 内限定の
process-level 改善 (例: test 数予測の精度) は各 Sprint の retrospective に留める。

## HEREDOC escape for `$` in commit messages (Sprint 23 Try → standard)

**問題**: Sprint 23 (`9cc2c12`) で subject line に `\$env` が混入
(`fix(vba-bridge): pass args via \$env:VERDE_* instead of format! body`)。
pre-commit hook 失敗時に amend 禁止ルールが優先するため修正できず、履歴に
残留。

**ルール**: commit message の **subject line に literal `$` を含む場合**、
HEREDOC 経由ではなく外 single-quote の単一行形式を使う:

```bash
git commit -m 'fix(vba-bridge): pass args via $env:VERDE_* instead of format! body'
```

body 部分は HEREDOC のままで可 (`<<'EOF'` single-quoted なら `$` は透過)。
ただし subject だけは single-quote 優先 — paste / shell history 経由で `\$`
が意図せず混入する経路を断つため。

**適用範囲**: 本プロジェクト全体。Claude Code および human author 両方。
違反を検知したら (HEREDOC 経由 subject に `$` を含む commit が作られた場合)、
`git commit --amend` は **使わず** (既存 amend 禁止ルール優先)、次 commit で
正しい形式を使うこと。過去の subject は履歴として保存。

