# Verde — Sprint History and Backlog (plan.md)

Compressed record of Sprints 3–17 plus consolidated follow-up backlog.

**Plan-bloat prevention policy (from Sprint 16):** at any time, only the
three most recent *decision-bearing* sprints are retained in full detail.
All earlier sprints collapse to one-line rows in the index table below —
`git log` + sprint tags are the authoritative source for their
commit-level detail. Compression-only sprints (like Sprint 16 itself) do
not consume a detail slot, and probe-only refinement sprints occupy one
slot at whatever density their outcome requires (often < 50 lines).
Currently detailed: Sprint 27 / 28 / 29. A planner adding a new sprint
section must demote the now-oldest detailed sprint into the index row in
the same commit. Sprint 17–19 were folded into index rows during Sprint
24 housekeeping (closing a pre-existing detail-drift). Sprint 23 was
demoted during Sprint 26 housekeeping. Sprint 24 was demoted during
Sprint 27 housekeeping. Sprint 25 was demoted during Sprint 28
housekeeping. Sprint 26 was demoted during Sprint 29 housekeeping.

## Sprint 3–26 summary index

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

# Sprint 26 — (index row に折り畳み済み; Sprint 29 housekeeping で demoted)

詳細は本ファイル冒頭の `Sprint 3–26 summary index` 内「26」行 + `git show
7fa3655` + Sprint 27 detailed section (Sprint 26 で確定した 6-commit 骨格の
実行記録) を参照。

# Sprint 27 (2026-04-21) — #16 実装: lock staleness image-name matching

## Goal

Sprint 26 で durable 化された 6-commit 骨格に従い、`lock.rs` に
`is_stale_by_image_match` pure helper + `process_image_basename` 3-OS
cfg-gate provider + `is_stale_with_provider` 拡張版を追加。`is_stale` を
provider 経由 delegator にリファクタし、Windows PID reuse wedge を構造的に
排除、Linux も同等、macOS は provider `None` 判定で既存 `is_pid_alive + TTL`
fallback を bit-perfect 維持 (behavioral 変化ゼロ)。

## Probes executed (Sprint start)

1. baseline: Rust `cargo test --lib` 57 passed / Frontend 63 passed
2. 既存 lock.rs 構造確認: `is_stale_by_ttl` は Sprint 18/25 で既に抽出済み
   (line 33-40) — Sprint 26 commit 2 の「抽出 Tidy」は不要、直接 pure helper
   追加が commit 1 に昇格。
3. `rg 'QueryFullProcessImageNameW' src-tauri/` → 0 hits (feature flag は
   Sprint 18 で有効化済み、symbol 未使用を確認)

## コミット実績 (Sprint 26 骨格通り)

| # | Commit | 内容 | Rust test delta |
|---|--------|------|-----------------|
| 1 | `9288277` | Tidy: `is_stale_by_image_match` pure helper + `EXPECTED_BASENAME` OS cfg const + 4 pure tests。`#[allow(dead_code)]` で未配線。 | 57 → 61 (+4) |
| 2 | `9c55913` | Tidy: `process_image_basename` 3-OS cfg-gate provider (Windows `QueryFullProcessImageNameW` / Linux `/proc/<pid>/comm` / macOS None)。macOS smoke test 追加。 | 61 → 62 (+1 on macOS host; Windows/Linux host は +1 別 smoke で同等) |
| 3 | `3045fb0` | RED: `is_stale_with_provider` signature 追加 (provider 引数受け取るが未使用)、`is_stale_reaps_same_machine_alive_pid_with_foreign_image` test が FAIL。 | 62 → 63 (RED: 62 passed / 1 failed) |
| 4 | `8d6df43` | GREEN: `is_stale_with_provider` 本体完成 (provider 呼び出し → `Some` なら image-match / `None` なら cfg-gated: Win/Linux=stale, macOS=TTL fallback)。`is_stale` を delegator 化。RED 反転。`#[allow(dead_code)]` 一括解除。 | 63 passed (RED → GREEN) |
| 5 | `629de6e` | Tidy-after: `is_stale_macos_fallback_respects_ttl` pin (provider `None` + within TTL → not stale、TTL expired → stale)。rule-of-three probe skip 判断を commit message に記録。 | 63 → 64 (+1) |
| 6 | (本 commit) | docs: 本 retrospective + preamble `25 / 26 / 27` 更新 + Sprint 24 index demotion + backlog #16 CLOSED + Sprint 26 Follow-up bullet 完了化 | 64 (無変更) |

## 受け入れ基準の照合

- `cargo test --lib` **64 passed** (予測 65 から -1; 後述 Problems 参照)
- `cargo clippy --lib -- -D warnings` クリーン ✅
- `bun run test` **63/63** 緑 (frontend 無変更) ✅
- `bun run tsc --noEmit` クリーン ✅
- RED pin (`is_stale_reaps_same_machine_alive_pid_with_foreign_image`) が GREEN ✅
- macOS fallback pin (`is_stale_macos_fallback_respects_ttl`) が緑 ✅
- `rg 'process_image_basename' src-tauri/` → `lock.rs` のみに 3-OS cfg-gate 実装 + smoke tests + production wiring が観察される ✅
- preamble drift 閉鎖 + Sprint 24 index demotion ✅
- backlog #16 を CLOSED に更新 ✅

## Retrospective (KPT)

### Keep

- **Sprint 26 durable design に最後まで従った**: commit 分割・cfg gate の
  `None` 2 意味・provider 型 `fn(u32) -> Option<String>` 採択・macOS
  fallback 保持など、Sprint 26 Key decisions を実装中の誘惑 (例:
  `PidVerification` enum 導入で型に invariant を持たせたくなる) から守った。
  Sprint 22→23 / 24→25 / 26→27 で 3 回連続で "Planning Sprint →
  Implementation Sprint" pattern が robust に機能。
- **`is_stale` を delegator 化**: production 経路と test 経路が同じ
  `is_stale_with_provider` body を通る構造にしたことで、cfg 分岐 / provider
  `None` 分岐の drift を構造的にゼロ化。将来の refactor で「test は通るが
  production で違う」事故を防ぐ。
- **Tidy First 分離を commit 1-2 で厳格に守った**: 両 commit 共に
  `#[allow(dead_code)]` を明示し production 未配線を self-documenting。
  commit 4 の GREEN で全 allow を一括解除、commit message で依存関係を
  明示。review 時に「いつ configure された」が diff で追える。

### Problem

- **test 数予測が +1 ズレた (予測 65, 実績 64)**: cfg-gated smoke tests は
  test runner の active OS でのみコンパイルされるため、host-dependent で
  active test count が変動する。Sprint 26 design table "cfg 毎に 1 smoke
  test" の予測値 +2 は host-agnostic の合計であり、単一 host の実測値
  (macOS host では +1) と対応しない。**再発防止**: 次回 cfg-gated test を
  追加する Planning Sprint では `+N per host` 表記を使い、host 非依存の
  合計と混同しないようにする。
- **stakeholder 指示文書と Sprint 26 durable design 間の不整合**:
  stakeholder 指示文書では「既存 stale 判定関数から TTL check を
  `fn is_stale_by_ttl` に抽出」とあったが、実際には Sprint 18/25 で既に
  line 33-40 で抽出済みだった。Sprint 26 design table (line 816) は抽出を
  前提とせず image-match pure helper 追加を commit 1 としていたため、
  design table を truth source にして回避。**再発防止**: stakeholder
  指示と durable design table 間で矛盾を検出したら、durable design を
  優先し不整合を retrospective に記録。
- **Provider `None` cfg 分岐の可読性**: `is_stale_with_provider` の
  `match provider(pid) { ... None => { #[cfg(...)] {...} #[cfg(...)] {...} } }`
  構造は動作するが、cfg gymnastics が function body に露出している。
  将来 BSD 等の OS 対応が surface したら、`None` を受けた時の挙動を
  OS-specific pure helper `fn stale_from_unavailable_provider() -> bool` に
  抽出する余地あり。現時点では rule-of-three 未到達 (1/3) で skip。

### Try

- **Windows/Linux 実機 verification (Sprint 28 以降 / follow-up)**:
  stakeholder / CI 環境で (i) `process_image_basename` が実プロセス名を
  返すか、(ii) PID reuse シナリオを意図的に再現して image-name mismatch
  で stale 判定されるかを verify。Sprint 25 の JP-locale verification と
  同じく post-implementation follow-up として保留。
- **cfg-gated test count の per-host 表記 convention**: 次回 cfg-gated
  smoke test を追加する Planning Sprint では `+N tests per host (total +M
  across 3 hosts)` 形式で予測、実測との乖離を最小化。本 Sprint で
  Sprint 26 予測 `+8 → 65` が macOS host 実測 `+7 → 64` にズレた教訓。
- **rule-of-three cfg-gate pattern の解釈明確化**: Sprint 25 HRESULT cfg /
  `is_pid_alive` cfg / `process_image_basename` cfg で surface 数が 3 に
  到達したが、本 Sprint commit 5 message で共通化 skip を durable 記録
  (各々 OS-specific に完全に異なる body を持ち、共通 helper 化は cfg
  gymnastics 移動にしかならない)。**rule-of-three は「共通 surface が
  3 箇所に見えたら抽出」であり「cfg 構文が 3 回現れたら抽出」ではない**
  という durable 解釈を次 Planning に伝搬。

## 変更コミット一覧

| Commit | 内容 |
|--------|------|
| `9288277` | refactor(lock): add is_stale_by_image_match pure helper + EXPECTED_BASENAME (Tidy First) |
| `9c55913` | refactor(lock): add process_image_basename 3-OS cfg-gate provider (Tidy First) |
| `3045fb0` | test(lock): add is_stale_with_provider stub + foreign-image RED test |
| `8d6df43` | fix(lock): wire image-name provider into is_stale, closing #16 |
| `629de6e` | test(lock): pin macOS fallback invariant for provider=None (Tidy After) |
| (本 docs) | docs(plan): record Sprint 27 — #16 closed; demote Sprint 24 |

## Key decisions (durable)

- **`None` cfg-gate semantics を commit 4 で cfg macro 2 枝に落とし込んだ**:
  `#[cfg(any(windows, target_os = "linux"))] { true }` /
  `#[cfg(target_os = "macos")] { ttl_expired }`。Sprint 26 key decision
  「`Option<String>` + OS cfg で invariant を切り分け」の実装形。enum
  昇格 (`PidVerification` 等) は型が invariant を表現して見栄えが良いが、
  cfg gate を「型の 2 値」に圧縮すると macOS 側が `Verified(None)` を
  誤って解釈するリスクが生まれる。cfg で静的に分けると "macOS ビルドには
  Windows/Linux 枝が 1 行も混入しない" という構造的保証が得られる。
- **`is_stale_with_provider` signature を RED commit (commit 3) で先に
  凍結**: commit 3 の stub は provider を accept して discard する。API
  contract が先に確定することで、commit 4 の body 変更が test contract を
  破壊しない保証が TDD 的に得られる。Sprint 25 pinned-negative flip と
  同じ「契約先行 / 実装後行」pattern。
- **`EXPECTED_BASENAME` の macOS 値を残した**: production 経路では macOS は
  provider `None` で image-match に到達しないため未使用だが、`"verde"`
  定義を残すことで (i) 将来 macOS 向け native API を wire する際に
  comparison 側の準備が不要 (ii) pure helper `is_stale_by_image_match` の
  macOS 単体テストを `#[cfg]` 切り分けなしで書けた。`#[allow(dead_code)]`
  で dead-code warning を抑制、doc comment で意図を明記。
- **rule-of-three cfg-gate 共通化を skip**: Sprint 25 HRESULT classification
  + `is_pid_alive` + `process_image_basename` の 3 箇所で cfg-gate 構文が
  surface したが、各々が OS-specific に本質的に異なる API を呼んでいるため
  共通 helper を抽出しても cfg gymnastics が別関数に移動するだけ。
  rule-of-three は「共通 surface が 3 箇所に見えたら抽出」であり、
  「cfg 構文が 3 回現れたら抽出」ではないという durable 解釈を本 Sprint で
  明示化。

## Follow-ups

- **Windows 実機 verification (post-Sprint 27)**: `QueryFullProcessImageNameW`
  が実際の Verde プロセス名を小文字で返すか、PID reuse シナリオを意図的に
  再現して image-name mismatch で stale 判定されるかを stakeholder / CI
  環境で verify。Sprint 25 JP-locale verification と並行 backlog。
- **Linux container 環境での `/proc/<pid>/comm` 挙動調査**: container
  runtime によって basename が container の entrypoint 名になるケースが
  あり得る。Follow-up として rule-of-three-style に「実例 3 件」が surface
  したら `/exe` readlink フォールバック追加を検討。
- **long-path enable Windows 環境での buffer 過小**: `buf[260]` は
  `MAX_PATH` 準拠だが、Windows 10+ long-path enable 環境で Verde が
  `Program Files` 以外の長い path から起動される場合に truncation 可能性
  あり。stakeholder 報告ベースで surface したら buffer 再試行 loop 追加を
  検討。
- **preamble "Currently detailed" drift 再発防止**: Sprint 28 追加時に
  `25 / 26 / 27` → `26 / 27 / 28` 更新 + Sprint 25 index demotion を同
  コミットで行うこと (本 Sprint で示した 3-sprint sliding window 手順の
  踏襲)。

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

