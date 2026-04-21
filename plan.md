# Verde — Sprint History and Backlog (plan.md)

Compressed record of Sprints 3–17 plus consolidated follow-up backlog.

**Plan-bloat prevention policy (from Sprint 16):** at any time, only the
three most recent *decision-bearing* sprints are retained in full detail.
All earlier sprints collapse to one-line rows in the index table below —
`git log` + sprint tags are the authoritative source for their
commit-level detail. Compression-only sprints (like Sprint 16 itself) do
not consume a detail slot, and probe-only refinement sprints occupy one
slot at whatever density their outcome requires (often < 50 lines).
Currently detailed: Sprint 28 / 29 / 30. A planner adding a new sprint
section must demote the now-oldest detailed sprint into the index row in
the same commit. Sprint 17–19 were folded into index rows during Sprint
24 housekeeping (closing a pre-existing detail-drift). Sprint 23 was
demoted during Sprint 26 housekeeping. Sprint 24 was demoted during
Sprint 27 housekeeping. Sprint 25 was demoted during Sprint 28
housekeeping. Sprint 26 was demoted during Sprint 29 housekeeping.
Sprint 27 was demoted during Sprint 30 housekeeping.

## Sprint 3–27 summary index

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

# Sprint 26 / 27 — (index row に折り畳み済み)

Sprint 26: Sprint 29 housekeeping で demoted。詳細は冒頭の `Sprint 3–27
summary index` 内「26」行 + `git show 7fa3655` を参照 (Sprint 27 6-commit
骨格の Planning-only 確定)。

Sprint 27: Sprint 30 housekeeping で demoted。詳細は同 index「27」行 +
`git show 9288277 9c55913 3045fb0 8d6df43 629de6e` を参照 (Sprint 26 骨格
の実装記録、`#16` CLOSED, +7 → 64 Rust tests on macOS host)。Sprint 27
Follow-ups (Windows / Linux / long-path 実機 verify) は Sprint 28 candidate
table の F1-F3 に転記済み。Sprint 27 Try (per-host test count 表記 +
rule-of-three cfg-gate 解釈) は Commit discipline notes と Sprint 28 design
で durable 化済み。

# Sprint 28 (2026-04-21) — Planning-only: Follow-up triage + Sprint 29 候補筆頭選定

## Goal

docs-only Planning Sprint (Sprint 22 / 24 / 26 と同 pattern で 4 回目)。
Sprint 27 Follow-ups 3 件 (Windows verify / Linux container `comm` /
long-path buffer) と Sprint 25 JP-locale verify の 4 件を、**trigger 条件
付き候補**として plan.md に durable 記録し、いつ / どうやって Sprint 29+N
で拾い上げるかを明示する。併せて Sprint 29 候補筆頭を 1 件選定 (着手可否
判断は Sprint 29 時点で再評価、本 Sprint は判断材料のみ)。

## 条件付き Follow-up 候補表

| ID | 項目 | Trigger | Effort | 依存 | Surface 頻度 |
|----|------|---------|--------|------|--------------|
| F1 | Windows `QueryFullProcessImageNameW` 実機 verify (#16 post) | Windows CI 環境整備 / stakeholder 環境で image-name mismatch の false +/- 報告 | S | Sprint 27 GREEN (済) | 中 (stakeholder-report 駆動) |
| F2 | Linux container `/proc/<pid>/comm` 挙動調査 / `/exe` 降格判断 (#16 post) | Linux container deploy 決定 / `verde-helper` 等 basename 衝突実例 3 件 | S | Sprint 27 GREEN (済) | 低 (development-time surface 待ち) |
| F3 | Windows long-path enable 環境での `buf[260]` overflow 再検討 (#16 post) | Verde が >260 char path 配下で起動される実例 3 件 / stakeholder 報告 | XS | Sprint 27 GREEN (済) | 低 |
| F4 | JP-locale EXCEL_OPEN E2E verify + `InnerException.HResult` 優先ロジック検証 (#17 post) | 日本語 Windows stakeholder 環境で import 失敗 E2E 可能 / CI JP-locale runner 整備 | S | Sprint 25 GREEN (済) | 中 (stakeholder-report 駆動) |

## Sprint 29 候補筆頭: **F4** (JP-locale EXCEL_OPEN verify)

選定根拠:

- **Trigger 成立可能性**: F1 / F4 共に stakeholder-report 駆動で中頻度。
  F4 は Sprint 25 Key decisions で `InnerException.HResult` 優先が未検証
  durable risk として明示記録 (`.NET` `TargetInvocationException` wrap の
  InnerException が実機 JP Excel で本物の COM HResult を露出するかは
  macOS 上 full TDD では確認不能)。時間経過で検証 debt が増す。
- **Effort**: S (stakeholder 実行の verify タスクが主、Verde 側は stderr
  受信 + UI EXCEL_OPEN 発火の確認のみ)。
- **判断材料** (Sprint 29 着手時に再評価): (a) stakeholder JP Windows
  環境の準備状況、(b) Windows CI (JP-locale runner) の整備可能性、
  (c) verify 失敗時の HRESULT 抽出ロジック (`InnerException` 優先 ↔
  `Exception.HResult` 直接) 調整 surface (Sprint 25 Try 項目参照)。
- **判断保留**: Sprint 29 を Planning Sprint として切るか直接実装に入るか
  は着手時に再評価。本 Sprint 28 では候補筆頭を固定するのみ。trigger 未
  成立なら product-signal 由来の別 PBI を優先。

## rule-of-three cfg-gate 監視結果 (Sprint 27 継承 / 本 Sprint で確定採択)

Sprint 27 Tidy-after commit (`629de6e`) message で `HRESULT cfg /
is_pid_alive cfg / process_image_basename cfg` の 3 surface 到達を記録し、
**共通化 skip を durable 判断**として確定済み (各 cfg 分岐は OS-specific
に本質的に異なる API を呼ぶ — 共通 helper 抽出は cfg gymnastics を別関数
に移動するだけで net gain ゼロ)。本 Sprint 28 でも状況変化なし。

**Sprint 28 以降の cfg-gate helper 使用方針 (確定)**:

- rule-of-three は「共通 surface が 3 箇所」であって「cfg 構文が 3 回」
  ではない。cfg surface のみが 3 に達した段階では抽出しない。
- 再評価 trigger: BSD 等 4 つ目 OS に provider を追加する PBI が surface
  し、かつ provider 本体に OS 非依存な共通ロジック (basename 正規化・
  PID validation など) が surface した時点で再評価。現時点で該当なし。

## KPT

- **Keep**: Planning-only docs Sprint (本 Sprint で 4 回目) を 1 commit
  に閉じ込めることで sunk-cost bias と alternative 検出時の design 急ぎ
  を回避する pattern が再履行された (Sprint 22→23 / 24→25 / 26→27 / 28→?)。
- **Problem**: 4 候補いずれも stakeholder / CI 環境整備が trigger で、
  planner 単独では trigger 進捗不能。Sprint 29+N のスケジュール不確実性
  が高く、backlog に「待機案件」が累積しやすい構造。
- **Try**: Sprint 29 着手時に F1–F4 の trigger 成立状況を backlog 再評価
  checklist として走らせる (未成立なら product-signal 由来の別 PBI 優先)。

## Follow-ups

- **Sprint 29 着手時点で F4 筆頭 / F1 次点の trigger 再評価** (本 Sprint で
  durable 固定した選定を override する新 signal が無いか確認)。
- **preamble "Currently detailed" drift 再発防止**: Sprint 29 追加時に
  `26 / 27 / 28` → `27 / 28 / 29` + Sprint 26 index demotion を同 commit で。
- **rule-of-three cfg-gate 再評価 trigger**: BSD 等 4 つ目 OS provider PBI
  が surface し、かつ共通ロジックが実体化したとき (現在 surface なし)。

# Sprint 29 (2026-04-21) — Planning-only: F1-F4 trigger 再評価 + Intentional Pause (2) 再起動

## Goal

docs-only Planning Sprint (Sprint 22 / 24 / 26 / 28 と同 pattern で 5 回目)。
Sprint 28 KPT Try 項目 (L340) の「F1-F4 trigger 成立状況を backlog 再評価
checklist として走らせる」を本 Sprint で execute。Sprint 28 完了後 planner
巡回 7 回にわたり stakeholder signal ゼロで不介入継続した **passive 滞留**
(= 未正式化の de-facto pause) を解消し、trigger 全未成立 + 代替 product-signal
PBI ゼロ を確認のうえ、正式 **Intentional Pause (2)** を plan.md に durable
再起動する差し戻し側に着地する。実装ゼロ、docs 1 commit で閉じる。

## Probes executed (Sprint start)

1. **passive 滞留の実測**: `git log 36b0c48..HEAD` → コミットゼロ (Sprint 28
   docs 後から本 Sprint 起動まで 7 巡)。planner 巡回中の silent refinement
   禁止原則 (Pause 1 L100-102) を踏襲し、本 Sprint 起動自体が「checklist
   Sprint」として機能する構造に回収。
2. **baseline**: Rust 64 passed / Frontend 63 passed (Sprint 27 以降コード
   無変更)。本 Sprint docs-only のため `cargo test` / `bun run test` /
   `bun run tsc --noEmit` は変更なしを確認するのみ。
3. **bypass arc 再確認**: `rg '!\.' src/` → 0 hits (Sprint 15 以降不変) /
   `rg 'as\s+[A-Z]' src/ --type ts` → test 1 件 (ガード付き正当、保持) /
   `rg '@ts-ignore|@ts-expect-error' src/` → 0 hits。Sprint 26 と同一、
   planner 単独での新 signal ゼロ。
4. **rule-of-three 再走査**: Sprint 27 retrospective で durable 確定済み
   (`HRESULT cfg / is_pid_alive cfg / process_image_basename cfg` = 3 surface、
   共通化 skip)。本 Sprint で状況変化なし。Sprint 28 で確定済みの再評価
   trigger (BSD 等 4 つ目 OS provider + OS 非依存共通ロジックの surface) も
   非該当。

## F1-F4 trigger 再評価 checklist (Sprint 28 Try の execute)

| ID | 項目 | Trigger 条件 (Sprint 28 定義) | 本 Sprint 評価 | 判定 |
|----|------|------------------------------|---------------|------|
| F1 | Windows `QueryFullProcessImageNameW` 実機 verify (#16 post) | Windows CI 環境整備 or stakeholder 環境で image-name mismatch の false +/- 報告 | planner 巡回 7 回に該当 signal ゼロ | **未成立** |
| F2 | Linux container `/proc/<pid>/comm` 挙動調査 / `/exe` 降格判断 (#16 post) | Linux container deploy 決定 or `verde-helper` 等 basename 衝突実例 3 件 | container deploy 決定なし、衝突実例 0 件 | **未成立** |
| F3 | Windows long-path enable 環境での `buf[260]` overflow 再検討 (#16 post) | Verde が >260 char path 配下で起動される実例 3 件 / stakeholder 報告 | 実例報告 0 件 | **未成立** |
| F4 | JP-locale EXCEL_OPEN E2E verify + `InnerException.HResult` 優先ロジック検証 (#17 post) | 日本語 Windows stakeholder 環境で import 失敗 E2E 可能 / CI JP-locale runner 整備 | Sprint 28 筆頭候補だが stakeholder JP Windows 環境準備 signal なし | **未成立** |

**4/4 未成立**。Sprint 28 Try (L340)「未成立なら product-signal 由来の別 PBI 優先」を次節で実施。

## 代替 product-signal 由来 PBI の探索

1. **Open backlog 再走査** (L55-74 の 17 行):
   - #1–#4: 全 stakeholder product decision gate、Sprint 5 以降 signal 不到着
   - #5: rule-of-two 継続、rule-of-three 証拠なし
   - #6: `checkConflict` 構造化 logging、telemetry 証拠なし
   - #7–#9: product/UX decision or restructure PBI gate、signal 不到着
   - #10/#11: planning-process 既済 (Sprint 16+ で active integration)
   - #12/#13: backend content-conflict error-kind の発火なし (バックエンド側着手前提)
   - #14: 引退 placeholder
   - #15/#16/#17: **CLOSED** (Sprint 23 / 27 / 25)

2. **Sprint 28 条件付き候補 F1-F4**: 前節で全数未成立。

3. **scrum.ts / plan.md "Next Sprint Candidates" / refinable PBI 走査**:
   - `scrum.ts` 不在 (プロジェクト root の `ls` 結果で確認済み; Verde では
     plan.md を single source of truth として運用)
   - plan.md 内 "Next Sprint Candidates" grep 不該当 (Sprint 28 は F1-F4 を
     「条件付き候補」として列挙するのみで、active candidate として surface
     するものはゼロ)

4. **planner 能動 probe 結果** (本 Sprint Probes L3-4):
   - bypass arc = 0 hits 継続 (Sprint 15 arc closed)
   - `rg 'TODO|FIXME|XXX' src/ src-tauri/` → Sprint 17 で `App.tsx:211` を
     #12 化して以降、新規追加ゼロ
   - rule-of-three monitoring: Sprint 27/28 で durable に skip 判断固定済み、
     再評価 trigger 未到達

**結論**: 代替 product-signal 由来 PBI ゼロ。F1-F4 全未成立 + 新規 signal
ゼロ + rule-of-three 未到達。Pause 再起動条件に合致。

## Intentional Pause (2) — 再起動宣言

**再起動根拠** (3 条件すべて合致):

- (a) 本 Sprint 29 の F1-F4 trigger 再評価が **全未成立** (4/4)
- (b) scrum.ts / plan.md backlog / planner 能動 probe のいずれも **代替 PBI
  を surface しない**
- (c) planner 巡回 7 回の **passive 滞留** は「未正式化の de-facto pause」
  であり、これを正式化することで stakeholder signal をより明示的に要求する
  姿勢を回復する

Sprint 18 で exit した Intentional Pause (1) (L75-102) と同根拠: 「silent
probe を禁じ、条件解釈を planner 側で緩めない」構造を維持する。Pause (1)
L80-82 の既定ルール「前回 Pause の体裁を書き換えるのではなく、履歴として
累積する」を踏襲し、本 Pause (2) を **新規追加** する。

**再開条件 (いずれか 1 つで exit)**:

- (a) **stakeholder から明示的な新規 PBI 投入** (Pause 1 の exit pattern: Sprint
  14 / 17 で蓄積された advisory が Pause 昇格時に stakeholder 行動を引き出した
  構造、L86-89 参照)
- (b) **F1-F4 のいずれかの trigger 条件が stakeholder / 外部 signal で成立**:
  - F1: Windows CI 整備完了 / stakeholder 環境での image-name mismatch 実例
  - F2: Linux container deploy 決定 / basename 衝突実例 3 件
  - F3: >260 char path 環境での Verde 起動実例 3 件
  - F4: JP-locale Windows stakeholder 環境準備完了 / CI JP-locale runner 整備
- (c) **Sprint 17 "orthogonal probe axis" 相当の新 signal axis** が surface
  (planner 単独では発掘できない範囲 — Pause (1) の Sprint 18 security 投入が
  この axis に該当したという前例、L90-93)

**Pause 中に planner が行うこと / 行わないこと** (Pause 1 原則の踏襲):

- **行う**: 本 Pause の exit 判定 (stakeholder signal の到着確認のみ)。exit
  成立まで「継続 Pause」の短文報告で閉じる。
- **行わない**:
  - silent probe による新規 refinement PBI の発掘 (= Pause 構造の自己無効化)
  - 条件解釈の緩和 (例: 「trigger 3 件 → 2 件で exit」等の基準改変、「planner
    巡回 N 回経過で自動 exit」等の時間経過 trigger 新設)
  - Sprint 30 の提案 (exit 成立後のみ新 Sprint 起動可能)

**再発防止の教訓 (Pause 1 線 + 本 Pause 追加分)**:

- Pause 1 で durable 化済みの 3 原則: (i) silent probe 禁止 (ii) 条件解釈
  緩和禁止 (iii) exit は stakeholder の明示指示。本 Pause 2 でも全て維持。
- **本 Pause 追加の教訓**: planner 巡回 N 回の passive 滞留を検知したら、
  1 Sprint 単位で「条件 trigger 再評価 checklist」を走らせ、trigger 全未成立
  + 代替 PBI ゼロなら正式 Pause に escalate する手続きを durable 化する。
  passive 滞留 (N 巡 de-facto pause) と正式 Pause の境界を明示化する pattern
  を次回参照用に固定。

## KPT

- **Keep**: Planning-only docs Sprint (本 Sprint で 5 回目) を 1 commit に
  閉じ込める pattern が継続機能。stakeholder signal 不在の確認作業も
  「commit = signal」として記録することで planner 巡回の可視性を確保。
  Sprint 22→23 / 24→25 / 26→27 / 28 / 29 で 5 回連続で Planning-only pattern
  が機能。
- **Problem**: Sprint 28 Try 項目「trigger 成立状況を backlog 再評価
  checklist」の実行タイミングが暗黙に次 Sprint 着手時点に先送りされ、
  planner 巡回 7 回の passive 滞留を招いた。Try 項目の実行 deadline
  (= 次 Sprint Probes 冒頭) を明記しなかったことが原因。
- **Try**: 今後の retrospective Try 項目のうち「次 Sprint 冒頭で走らせる
  checklist」型は `[Due: Sprint N+1 Probes executed]` label を付して durable
  化。exit 後の Sprint 30 以降で同 pattern を適用。また Pause 中の planner
  巡回は「継続 Pause」の 1 行報告で終える convention を次 Pause 時にも維持。

## Follow-ups

- **Pause exit 時の再起動手順**: exit 成立 (上記 a/b/c のいずれか) 後、次 Sprint
  Planning で (i) exit trigger を明記 (ii) 本 Intentional Pause (2) section を
  「終了記録」に変換 (L75-102 体裁踏襲、書き換えではなく `**exited YYYY-MM-DD
  by Sprint N**` 追記方式で新規 bullet 追加) (iii) 新 Sprint Goal を exit
  signal 由来で構築。Pause (1) exit の履歴は plan.md 内で cross-reference
  可能な状態で保全されている。
- **preamble "Currently detailed" drift 再発防止**: Sprint 30 (= Pause exit 後
  の最初の detail Sprint) 追加時に `27 / 28 / 29` → `28 / 29 / 30` 更新 +
  Sprint 27 index demotion を同 commit で行う。Sprint 26 で確立した
  3-sprint sliding window 手順の踏襲。
- **Pause 累積履歴の保全**: 本 ファイル上で Pause (1) と Pause (2) が独立
  section として共存する構造を維持。Pause (3) が将来 surface する場合も
  同様に追記方式で累積する (既存 Pause section は書き換えない)。

## 変更コミット

| Commit | 内容 |
|--------|------|
| (本 docs) | Sprint 29 Planning section 追加 (F1-F4 triage execute + 代替 PBI 探索 + Intentional Pause (2) 再起動宣言) + preamble `26 / 27 / 28` → `27 / 28 / 29` + Sprint 26 index demotion + index 見出し `Sprint 3–25` → `Sprint 3–26` |

## Key decisions (durable)

- **passive 滞留 → 正式 Pause への escalate 手続き**: planner 巡回 N 回
  (本 Sprint は N=7) の間に trigger 成立 signal ゼロ + 代替 PBI ゼロ の場合、
  **1 回の Planning-only Sprint で checklist 走査 → 正式 Pause 再起動宣言**
  を durable 手順化。「未正式化の de-facto pause」を放置しない。Pause (1)
  exit pattern (stakeholder 明示指示による解除) と対称的な「正式 Pause への
  移行」手順を本 Sprint で新規確立。
- **Intentional Pause は累積履歴として管理**: Sprint 18 で exit した Pause
  (1) section (L75-102) を書き換えずに Pause (2) を **新規追加**。L80-82
  の既定ルール踏襲。Pause 履歴が plan.md 内で durable に累積する構造を維持
  することで、次 Pause (3) 発生時も同 pattern で運用可能。
- **trigger 条件解釈の緩和禁止の再確認**: Sprint 28 F1-F4 trigger は
  「stakeholder report / CI 整備 / 実例 3 件」等の外部 signal を要求。
  planner 巡回 N 回の時間経過を trigger 基準の下方修正に使わない
  (Sprint 14 "silent refinement is trigger for product conversation" →
  Sprint 17 "orthogonal probe axis" → Pause (1) exit pattern の延長線)。
  時間経過を「trigger 緩和」に使わず「正式 Pause 宣言」に使う区別が
  本 Sprint の durable 判断。
- **Sprint 26 index demotion の sliding window housekeeping**: Sprint 28
  Follow-ups (L346-347) の指示を本 Sprint で execute。3-sprint sliding window
  を堅持 (`27 / 28 / 29` detailed; Sprint 26 は index row へ折り畳み)。Sprint
  26 で durable 化された設計詳細は `git show 7fa3655` + index row の key
  decisions 欄 + Sprint 27 detailed section (Sprint 26 骨格の実行記録) で
  3 重に保全され、detail section 削除での情報欠損なし。

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

