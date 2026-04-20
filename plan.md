# Verde — Sprint History and Backlog (plan.md)

Compressed record of Sprints 3–17 plus consolidated follow-up backlog.

**Plan-bloat prevention policy (from Sprint 16):** at any time, only the
three most recent *decision-bearing* sprints are retained in full detail.
All earlier sprints collapse to one-line rows in the index table below —
`git log` + sprint tags are the authoritative source for their
commit-level detail. Compression-only sprints (like Sprint 16 itself) do
not consume a detail slot, and probe-only refinement sprints occupy one
slot at whatever density their outcome requires (often < 50 lines).
Currently detailed: Sprint 23 / 24 / 25. A planner adding a new sprint
section must demote the now-oldest detailed sprint into the index row in
the same commit. Sprint 17–19 were folded into index rows during Sprint
24 housekeeping (closing a pre-existing detail-drift).

## Sprint 3–22 summary index

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
| 16  | Image-name-based lock staleness (Windows + Linux)                  | S18         | (i) production PID-reuse wedge report, or (ii) voluntary re-eval after Sprint 25 (see Sprint 24 design-weight matrix) |
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

# Sprint 23 (2026-04-21) — #15 実装: PS 引数 env-var 経由への移行

## Goal

Sprint 22 の設計判断 (Approach 1 = 環境変数経由) を TDD で実装し、
PowerShell injection surface を **構造的に排除** する。`validate_ps_arg`
denylist と関連 injection テスト群を削除し、caller data は `Command::env()`
経由で OS env-var チャネルに載せ、PS スクリプトは `$env:VERDE_*` で参照する
静的 const へ移行する。

## Tidy First 分離

| 段階 | コミット | 種別 | 内容 |
| ---- | -------- | ---- | ---- |
| 1 | `4c00585` | Tidy (構造のみ) | PS 本体を `const EXPORT_SCRIPT_TEMPLATE` / `IMPORT_SCRIPT_TEMPLATE` に昇格。`format!` → `str::replace("{PLACEHOLDER}", ...)` へ置換機構を差し替え。validate_ps_arg と injection テストは温存 — 挙動変化ゼロ、55 Rust tests green 維持。 |
| 2 | `cf84fd8` | RED test | `*_injection_flavored_input_surfaces_platform_error_not_validator_error` の 2 テストを追加。validator が残っているため RED 確定 (2 failed)。 |
| 3 | `9cc2c12` | GREEN (挙動変更) | `format!`/`replace` 経路を廃止し、const は static PS 本体 (`$env:VERDE_*` 参照) へ置換。`Command::env("VERDE_*", ...)` 追加。`validate_ps_arg` 関数 + 7 ユニットテスト + 2 旧 injection テストを削除。RED 2 テストが GREEN に反転。 |
| 4 | (docs)   | docs         | このセクション + preamble の "Currently detailed" を `21 / 22 / 23` に更新 + Sprint 20 を index に demote。 |

## 実装後の env-var マッピング (実装に採用された最終形)

| PS 参照 | Rust env key | 用途 |
|---------|--------------|------|
| `$env:VERDE_XLSM_PATH` | `VERDE_XLSM_PATH` | export / import 共通 |
| `$env:VERDE_OUTPUT_DIR` | `VERDE_OUTPUT_DIR` | export のみ |
| `$env:VERDE_MODULE_NAME` | `VERDE_MODULE_NAME` | import のみ (既存 Module との衝突判定) |
| `$env:VERDE_MODULE_PATH` | `VERDE_MODULE_PATH` | import のみ (`Get-Content` / `Import` 引数) |

**差分メモ**: Sprint 22 Planning table には `VERDE_SOURCE_DIR` が含まれていたが、
実装では `source_dir + module_filename` の組み立てを Rust 側 (`Path::new(source_dir).join(module_filename)`)
で行う設計を継続したため PS 側で `$env:VERDE_SOURCE_DIR` を参照する動機がなく、
設定対象から外した。Planning がコード構造 (Rust 側で path 組み立て) を再確認しきれて
いなかった小さな見落とし。将来 PS 側で `Join-Path` させる方向に舵を切る設計変更が
起きたら再登場させる。

## 受け入れ基準 (達成)

- `cargo test --lib` **48 passed** (55 baseline − 7 validate_ps_arg tests − 2 旧 injection tests + 2 新 env-var tests)。
- `cargo clippy --lib -- -D warnings` クリーン。
- `bun run test` **63/63** 緑 (frontend 無変更)。
- `bun run tsc --noEmit` クリーン。
- `rg 'validate_ps_arg' src-tauri/` → 0 hits。
- `rg '\$env:VERDE_' src-tauri/` → PS スクリプトに 5 refs (`VERDE_XLSM_PATH` ×2, `VERDE_OUTPUT_DIR`, `VERDE_MODULE_NAME`, `VERDE_MODULE_PATH`)。
- VERDE_ prefix で他プロセス env vars との衝突回避 ✓。

## Planning 予測との差分

- Sprint 22 予測 `-10 → 45 tests`。実測 `-9 → 48 tests` (+2 RED tests 見落とし、
  かつ validate_ps_arg unit tests を 7 件と数え直し)。実害なし。
- Commit 1 の「構造変更のみ」を `format!` 内包字符列のままではなく
  `const + str::replace` 経路へ切り替える形で実現した — `format!` はリテラル文字列
  しか受け付けないため、`const` に昇格した時点で置換機構を変える必要があった。
  Planning が想定していた「同一 format! のまま const を渡す」案は Rust の制約で
  不成立。別パスで同じ Tidy First 要件を満たした。

## Key decisions

- **denylist 関数の完全削除は設計上正しい**: 残しておくと「env var 経路でも
  defensive に一応掛けておく」という anti-pattern を誘発する。surface が構造的に
  なくなったことが本質。validator を残すと「なぜそれがここにあるのか」に対する
  答えが劣化する。
- **`Command::env` の非継承挙動を明示的に使う**: Rust の `Command` API は
  `.env(...)` を使っても親プロセスの環境変数は継承される (継承しない場合は
  `.env_clear()`)。今回は `.env_clear()` はしない — PowerShell 自体の環境依存
  (例: `PSModulePath`) を壊さないため。`VERDE_` prefix で衝突回避は十分。
- **非 Windows ブランチの arg 名を `_`-prefix に変更**: validator 呼び出しが
  消えたため、非 Windows では引数が一切使われない。未使用警告を避けるため
  `_xlsm_path` など `_` プレフィックスに rename。signature は不変のまま。
- **Unicode パスのサポートが副次的に回復**: Sprint 18 の denylist は日本語
  ファイル名を通していたが `$` 等の ASCII 記号を含むパスは拒否していた。
  env var 経由は OS 層で bytes をそのまま運ぶため、任意の Unicode / 記号が
  透過する。#15 の副産物として MVP 体験が改善。

## KPT

### Keep
- **Tidy First を 3 コミットに厳格に分割**: 構造 → RED → GREEN という
  Sprint 22 の計画通りに commit 境界を守った。各段階で `cargo test --lib`
  を走らせ、期待通りに GREEN / RED / GREEN が切り替わったことを確認できた。
- **Planning が明示していた env-var 命名ポリシー (VERDE_ prefix)**:
  Sprint 22 で "他プロセス env vars 衝突回避" として約束したルールを
  実装で忠実に守れた。ad hoc な命名に流れなかった。
- **macOS 上で書けるテストを先行して RED に**: Windows 実機テストが書けない
  中、`platform error が surface する` という逆方向 assertion で Sprint 23 の
  成立を pin できた。非 Windows 環境での TDD 可能性を確認。

### Problem
- **Sprint 22 の test 数予測が 3 件ずれた**: `-10 → 45` と書いていたが実際は
  `-9 → 48`。(a) validate_ps_arg unit tests を 8 件と誤算 (実数 7)、
  (b) Commit 2 で +2 する RED tests の存在を予測に織り込んでいなかった。
  小さいが Planning 精度の課題。
- **Sprint 22 の env-var table が VERDE_SOURCE_DIR を含んでいた**: 実装時に
  Rust 側 path 組み立てが引き続き妥当と判断して落としたが、Planning で
  `source_dir + module_filename → module_path` の flow を再確認して
  いればテーブル時点で外せていた。
- **plan.md preamble の "Currently detailed" 表示が長らくズレていた**:
  Sprint 21 / 22 の追加時に "18 / 19 / 20" のままだった。Sprint 23 追加で
  "21 / 22 / 23" に更新したが、Sprint 17–19 が依然詳細のまま残っている
  (drift)。ルール ("3 most recent detailed") に対して pre-existing な違反。
- **Commit 3 のメッセージに HEREDOC escape 由来の `\$env` が残った**:
  `fix(vba-bridge): pass args via \$env:VERDE_* instead of format! body` —
  backslash が subject に入った。amend 禁止ポリシーに従い修正せず。
  今後 `$` を含むコミットメッセージは HEREDOC ではなく `-m $'...'` 併用などで回避。

### Try
- **Planning 段階で test 数の再計算を最終段で一度やる**: 数字が内訳の合計と
  合っているか 3 秒チェックするだけで防げる。
- **Planning env-var/設定 table を仕様と実装の両面から validate**:
  Rust 側で既に組み立てている値を PS 側に二重に渡さないか確認。
- **plan.md preamble の表示と現状が整合しているかを Sprint 完了時に 1 行 check**:
  drift を放置しない。
- **HEREDOC 経由のコミットメッセージで `$` が出るケースの正しいエスケープ**:
  `git commit -m "..."`＋外 single-quote 方式への切替を標準化する。
- **Sprint 17–19 の index demotion を housekeeping sprint で実施**: 次の
  Tidy Only / refinement-only sprint の budget を 1 枠割く価値あり。

## Follow-ups

- **Sprint 18 #16 (lock staleness)**: #15 完了により design-weight の
  残り 2 件 (#16 / #17) を再評価する段階に来た。`QueryFullProcessImageNameW`
  (Windows) + `/proc/<pid>/comm` (Linux) の両対応は macOS TDD で
  スタブのみテスト可能。それでも実装 surface は広い。Sprint 24 で Planning
  only にするか Sprint 22 型の design sprint にするかを先に判断する。
- **Sprint 18 #17 (HRESULT EXCEL_OPEN)**: Sprint 22 時点では #15 に blocked と
  記録されていた。#15 完了で unblock。ただし HRESULT extraction は PS 側の
  `$_.Exception.HResult` など読む必要があり、script 本体が COM 例外を raise
  するパスを想定する。Sprint 24 で #16 とどちらを先に取るかを design-weight
  で比較する。
- **Sprint 17–19 の詳細を index row に折り畳む housekeeping**: `plan-bloat`
  rule との drift を閉じる。他 Tidy と合わせて 1 sprint に束ねる想定。
- **`.env_clear()` を使わない判断を durable signal として保存**: 将来の
  planner が "env 分離の原則" 名目で `.env_clear()` を足したくなる誘惑を
  防ぐため、Key decisions の当該段に明示的に根拠を置いた。

# Sprint 24 (2026-04-21) — #16 / #17 design-weight 評価 + Sprint 17–19 housekeeping

## Goal

Sprint 23 で #15 が完了し、Sprint 18 で登録された残る 2 件の design-weight
follow-up (#16 lock staleness, #17 HRESULT EXCEL_OPEN) が blocked 状態から
解除された。本 Sprint で両者を正面から比較評価し、**Sprint 25 で着手する
1 件を確定**、もう 1 件の不採用理由を durable に記録する。併せて
**Sprint 17–19 の index demotion** (plan-bloat rule "3 most recent detailed"
への pre-existing drift 閉鎖) を同コミットに束ねる。docs-only、コード変更なし。

## Probes executed (Sprint start)

1. `rg '!\.' src/` → 0 hits
2. `rg 'as\s+[A-Z]' src/ --type ts` → test 1 件 (ガード付き正当 assertion、保持)
3. `rg '@ts-ignore|@ts-expect-error' src/` → 0 hits
4. `rg '\bany\b' src/ --type ts` → `expect.any(Error)` のみ
5. rule-of-three 新規候補: なし (Sprint 22 probe 結果から差分なし)

## Priority selection

- A (type-bypass): arc 維持 → skip
- B (#16 / #17 design-weight Planning): **採用** — Sprint 22 型 Planning-only Sprint
- C (rule-of-three): 未到達 → 監視継続

## #16 (lock staleness) design-weight

### 現行 lock 機構

`src-tauri/src/lock.rs` — `LockInfo { user, machine, pid, app, locked_at }` を
`~$<filename>.xlsm` に JSON 保存。`LockManager::is_stale` 決定表:

| same_machine | PID alive | TTL (7d) | 結果 |
|--------------|-----------|----------|------|
| yes | no | — | stale |
| yes | yes | expired | stale (Sprint 18 fallback) |
| yes | yes | within | not stale |
| no | — | expired | stale |
| no | — | within | not stale |

`is_pid_alive`: Windows `OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, ...)`、
非 Windows `libc::kill(pid, 0)`。

### ギャップ

PID reuse: Verde crash 後に Explorer / notepad 等に同一 PID が再割当されると
`is_pid_alive` が `true` を返し、lock が TTL (7 日) 経過まで wedge する。

### OS API 差異

| OS | API | 備考 |
|----|-----|------|
| Windows | `QueryFullProcessImageNameW(HANDLE, 0, buf, &mut len)` | `OpenProcess` 経由の HANDLE を再利用可能。basename 比較で `verde.exe` 照合。 |
| Linux | `/proc/<pid>/comm` (15文字 basename) / `readlink /proc/<pid>/exe` (フルパス) | 権限不足で読めないケースは fail-open / fail-close の設計判断が要る。 |
| macOS | `proc_pidpath(pid, buf, size)` (libproc) or `sysinfo` crate | 開発環境のみ対象 (production ターゲットではない)。 |

### macOS fallback 方針

macOS は dev 環境に限定。選択肢:

1. `#[cfg(any(windows, target_os = "linux"))]` で image-name 比較を有効化、
   macOS は現行 `is_pid_alive + TTL` にフォールバック
2. `proc_pidpath` を FFI で叩き、macOS にも実装
3. `sysinfo` crate を依存として投入、3 OS 統一

**推奨**: 選択肢 1。macOS は dev のみで wedge が起きても dev が即検知できる。
production (Windows) + CI (Linux) で完全対応すれば要件充足。

### TDD 可能性 (macOS)

- `is_stale_by_image_match(info, observed_name, expected_basename) -> bool` を
  **pure helper 化**すれば macOS で RED → GREEN 可能。
- 実 OS API 呼び出しは `#[cfg(...)]` gate 下で Windows / Linux CI のみで実行。
- Process name provider を trait / fn pointer 注入すると macOS でも
  integration-flavored test が書ける (Sprint 22 env-var 経路と同じ構造)。

### Approach 比較

| 軸 | (a) OS native API | (b) `sysinfo` crate | (c) TTL 短縮のみ |
|----|-------------------|---------------------|-----------------|
| PID reuse 検出 | 構造的 | 構造的 | 緩和のみ (時間窓) |
| 依存追加 | `windows` crate 既存 + `libc` | `sysinfo` 新規 (~500KB, 起動時間+) | なし |
| macOS ビルド | cfg-gate + TTL fallback | sysinfo 対応 | 変更なし |
| macOS TDD | pure helper で可 | crate mock 困難 | N/A (挙動不変) |
| LOC 増分 | 中 (~80 + tests) | 小 (~30) | 極小 (const 変更) |
| 依存制御 | 完全 | 外部 crate 追随 | 完全 |

**候補選定**: (a) OS native。`sysinfo` は process-listing 1 箇所の needs に
対して依存代償が過大 (本プロジェクトは Tauri + windows crate で必要な FFI surface を
既に保有)。TTL 短縮 (c) は legitimate 長時間セッションを誤 reap するリスクを
新設するため却下。

## #17 (HRESULT EXCEL_OPEN) design-weight

### 現行 classification

`src-tauri/src/project.rs:145` — `EXCEL_OPEN_SUBSTRINGS` 英語 5 件 (lowercase
`contains` match)。`src-tauri/src/project.rs:532` に **Sprint 18 で pin された
日本語ロケール negative-assertion test** (`is_excel_open_error_documents_known_japanese_locale_miss`)
が残存 — follow-up #17 着地時に assertion を positive へ反転する約束付き。

### ギャップ

日本語 Windows の COM 例外は `"ファイル '...' は別のプロセスで使用されている
ため..."` で 5 substring のどれにもマッチしない。結果: EXCEL_OPEN marker が
付与されず、UI は generic error banner を表示、「Excel を閉じて再試行」
ダイアログが発火しない。

### PS 側 HRESULT 読み取り経路 (仕様レベル)

PS `try { ... } catch { ... }` 内で `$_.Exception.HResult` が .NET exception の
signed int を返す。COM 例外では `$_.Exception.InnerException.HResult` 参照が
必要なケースあり。`Write-Error` / stderr に `VERDE_HRESULT=0x80070020` などの
tag 行を emit する仕様が Rust 側 parser との contract を結ぶ。

EXCEL_OPEN に対応する HRESULT (locale 非依存):
- `0x80070020` `ERROR_SHARING_VIOLATION` — ファイル共有違反 (Excel 保持)
- `0x80070021` `ERROR_LOCK_VIOLATION` — ロック領域アクセス

他 kind:
- `0x80070005` `E_ACCESSDENIED` → PermissionDenied
- `0x80030002` `STG_E_FILENOTFOUND` → NotFound
- `0x800A03EC` `XlNamedRange` Excel 固有 — 未分類 bucket

### Rust 側 error kind マッピング案

```rust
pub(crate) enum ErrorKind {
    ExcelOpen,          // 0x80070020, 0x80070021
    PermissionDenied,   // 0x80070005
    NotFound,           // 0x80030002
    Unknown(i32),       // 未分類
}
fn parse_hresult_tag(stderr: &str) -> Option<i32> { ... }
fn classify_hresult(hresult: i32) -> ErrorKind { ... }
```

両関数とも **完全 pure** — COM 呼び出しと切り離せるため macOS で full TDD 可能。

### Approach 比較

| 軸 | (a) HRESULT enum | (b) stderr substring (現行) | (c) exit code only |
|----|------------------|----------------------------|--------------------|
| locale-agnostic | ✅ | ❌ | ✅ |
| 拡張性 | enum に 1 行追加 | locale 毎に無限追記 | ❌ 細分不可 |
| PS 改変 | try/catch + tag emit 1 箇所 | 不要 | exit code 切り分け (広範改変) |
| Rust 改変 | parse + enum + tests | なし | 粒度粗い |
| macOS TDD | 完全 pure で full TDD | 既存通り | 限定的 |
| pinned-negative test の扱い | positive へ自然反転 | 維持 | 反転不可 |

**候補選定**: (a) HRESULT enum。Sprint 18 の pinned-negative test が自然な RED
として機能し、Sprint 22 の env-var 経路と同様に pure helper で macOS TDD が成立。

## Sprint 25 着手対象の確定

### 比較マトリクス

| 軸 | #16 lock staleness | #17 HRESULT EXCEL_OPEN |
|----|---------------------|------------------------|
| impact | PID reuse wedge (low freq; TTL 7d で待てば解ける) | 日本語 Excel の EXCEL_OPEN ダイアログ完全不発 (high freq, production UX 破損) |
| effort | 中〜大 (3 OS 分岐 + dev-env fallback + pure helper 分離) | 小〜中 (PS try/catch + pure parser + enum) |
| risk | 低 (現行 `is_pid_alive + TTL` がセーフティネット) | 低 (現行 substring match を fallback として併置可) |
| testability (macOS) | 中 (pure helper は可; API 呼び出しは不可) | **高** (`parse_hresult_tag` + `classify_hresult` 完全 pure) |
| user-visible value | 中 (crash 後 7d 待ちが数分で済む — 頻度低) | **高** (日本語 Excel でダイアログが初めて発火 — 毎 import) |
| 既存 RED test の有無 | なし (新規起票要) | **あり** (Sprint 18 `is_excel_open_error_documents_known_japanese_locale_miss`) |
| Sprint 22 型 Planning との整合性 | 3 OS fallback 設計は heavy (Planning 1 + 実装 1+ Sprint) | PS/Rust 契約 + enum — Sprint 22 env-var 規模 (Planning 1 + 実装 1) |

### 判断: Sprint 25 は **#17 (HRESULT EXCEL_OPEN)** を着手

**採択理由 (durable)**:

1. **user-visible value の質が本質的に異なる**: #16 の PID wedge は Sprint 18
   の TTL 7d fallback で「待てば解ける」問題になった。#17 は日本語ロケールで
   「何度 import しても一度も正しいダイアログが出ない」 — 待っても解けない。
   頻度 (毎 import) × 対象 (日本語ユーザー全員) × 持続性 (永続) の 3 軸で #17 が
   優先。
2. **Sprint 18 の pinned-negative test が自然な RED として機能**: Kent Beck の
   「壊れたテストから始める」セオリーに最小摩擦で乗れる。
   `is_excel_open_error_documents_known_japanese_locale_miss` の assertion 反転が
   Sprint 25 Day 1 の RED になる — Sprint 18 の planner が今日のために仕込んだ
   signal を履行する。
3. **macOS で full pure-helper TDD が成立**: `parse_hresult_tag(stderr)` と
   `classify_hresult(hresult)` は Windows COM と無関係な pure 関数。
   Windows 実機なしで RED → GREEN → REFACTOR が回る。
4. **Sprint 23 の成果が基盤として効く**: PS script 本体は既に static `const`。
   try/catch + HRESULT emit の改変は `EXPORT_SCRIPT` / `IMPORT_SCRIPT` の各
   1 箇所で完結。env-var 契約 (`$env:VERDE_*`) とも衝突しない。
5. **design-weight が Sprint 22 型に収まる**: #16 は 3 OS × image-name API ×
   dev-env fallback で Planning + 実装 Sprint の合計規模が #17 の 1.5〜2 倍。
   #17 は Sprint 22 と同規模で 1 Planning + 1 実装 Sprint に収まる見込み。

### #16 後回し理由 (durable)

- **effort が相対的に大きい**: Windows `QueryFullProcessImageNameW` + Linux
  procfs + macOS dev-env fallback + pure helper 分離。Sprint 22 型 Planning +
  実装 Sprint の合計規模が #17 の約 2 倍。
- **user-visible value が TTL で既に圧縮済み**: `lock.rs:18`
  `LOCK_STALE_AFTER_HOURS = 24 * 7` (Sprint 18) が PID reuse wedge の
  永続化を防いでいる。crashed Verde の lock は 7 日で reapable になる。
  「絶対に解けない」問題ではない。
- **再評価 trigger (durable)**:
  - (i) production で PID reuse wedge の明示的報告が stakeholder から入った場合
  - (ii) #17 完了後に本 Sprint の (a) OS native API 路線をベースに Sprint
    25+N の Planning として取り上げ
- **`sysinfo` 却下の durable 記録**: 将来の planner が #16 着手時に「楽な
  選択肢」として `sysinfo` を引っ張り込むのを防ぐため、本 Sprint で
  「1 箇所の needs に対して依存代償過大」と明記。本プロジェクトは既に
  `windows` crate / `libc` を持ち、OS native FFI surface がゼロコストで使える。

## Sprint 25 Sprint Goal 草案 (実装タスク粒度)

**Goal**: PS 側 try/catch で HRESULT tag (`VERDE_HRESULT=0x...`) を stderr に
emit し、Rust 側 pure parser が tag を抽出、`ErrorKind` enum +
`classify_hresult` で locale 非依存に EXCEL_OPEN を分類。Sprint 18 の
pinned-negative test を positive へ反転し、日本語 locale でも EXCEL_OPEN
marker が付与される contract を pin する。

### Tidy First 分離 (Sprint 23 と同形 3-commit)

| 段階 | コミット種別 | 内容 |
|------|-------------|------|
| 1 | Tidy (構造のみ) | `parse_hresult_tag(stderr: &str) -> Option<i32>` を pure helper として切り出す。既存 classifier は substring 経路のまま。+3 unit tests (hex / decimal / none)。挙動不変。 |
| 2 | Tidy (構造のみ) | `classify_hresult(hresult: i32) -> ErrorKind` を追加。`EXCEL_OPEN_HRESULTS: &[i32] = &[0x80070020u32 as i32, 0x80070021u32 as i32]`。+4 unit tests。挙動は未接続 (pure tests only)。 |
| 3 | RED | Sprint 18 `is_excel_open_error_documents_known_japanese_locale_miss` の assertion を positive へ反転。HRESULT 経路が未接続なので RED 確定 (1 failed)。 |
| 4 | GREEN (挙動変更) | `EXPORT_SCRIPT` / `IMPORT_SCRIPT` に `try { ... } catch { $h = $_.Exception.HResult; [Console]::Error.WriteLine("VERDE_HRESULT=0x{0:X8}" -f $h) }` 追加。Rust `classify_import_error` が `parse_hresult_tag` → `classify_hresult` 経路を通り、`ExcelOpen` の場合は EXCEL_OPEN marker を付与。substring fallback は HRESULT 無しケース (非 Windows テスト環境) のため併置。 |
| 5 | Tidy (後) | substring fallback の存廃判断。HRESULT 経路が非 Windows でも cover される証拠 (例: Linux CI で stub 経由の HRESULT injection テスト) が揃ったら substring 削除。未検証なら維持。 |
| 6 | docs | Sprint 25 retrospective + preamble "Currently detailed" を `22 / 23 / 24` → `23 / 24 / 25` 更新 + Sprint 22 を index へ demote。 |

### PS / stderr 契約 (draft)

| tag | 形式 | 例 |
|-----|------|-----|
| `VERDE_HRESULT` | `VERDE_HRESULT=0x{:08X}` | `VERDE_HRESULT=0x80070020` |
| `VERDE_HRESULT_MSG` (optional) | `VERDE_HRESULT_MSG=<trim>` | `VERDE_HRESULT_MSG=ファイル ...` |

parser は行単位で `VERDE_HRESULT=` prefix のみ抽出。未知 stderr は透過。
既存 substring matcher は tag 未検出時の fallback として働く。

### Test 予算 (予測)

- `parse_hresult_tag` pure tests: +3 (hex / decimal / none)
- `classify_hresult` pure tests: +4 (ExcelOpen x2, PermissionDenied, Unknown)
- pinned-negative flip: ±0 (既存 1 件の assertion 反転のみ)
- PS integration: 変化なし (Windows 実機のみで検証)
- 予測 delta: **+7 (48 → 55 Rust tests)**。Sprint 23 の `-9 → 48` からの再増加。

### Sprint 25 受け入れ基準 (予測)

- `cargo test --lib` 55 green (予測)
- `cargo clippy --lib -- -D warnings` クリーン
- `bun run test` 63/63 緑 (frontend 無変更)
- 日本語 pinned-negative test が positive 反転して green
- `rg 'VERDE_HRESULT=' src-tauri/` → PS 2 箇所 + Rust parser 1 箇所

## Housekeeping — Sprint 17–19 index demotion

本 Sprint で Sprint 17 / 18 / 19 の詳細 section を「Sprint 3–20 summary index」の
1 行 row へ折り畳み、plan-bloat rule ("3 most recent detailed") への
pre-existing drift を閉じた。保全された情報:

- **follow-up #15 (PS injection) の歴史**: Sprint 23 section に全詳細 (完了)。
- **follow-up #16 / #17**: 本 Sprint 24 で design-weight 評価を記録。
- **#12 / #13 (ConflictDialog wiring)**: backlog table に存続 (gate: backend
  error-kind)。
- **Intentional Pause 終了記録**: 別 section として保持 (durable signal — 将来の
  Pause 設計時に参照)。
- **Sprint 18 Key decisions** (denylist vs allowlist の理由、TTL 7d 根拠、
  pinned-negative 理由、validator 配置理由、Win32_System_Threading bundling 理由):
  commit message (`7c00520`, `084ee38`, `c875c58`) に保全。Sprint 24 以降で
  同根拠が再登場する場合は `git show` 参照。
- **Sprint 19 hook extraction 4 件 (C1–C4)** の詳細設計: commit message
  (`072b44b`, `352d74c`, `702e7fa`, `19d7d5a`) に保全。C5 defer → Sprint 20 で
  解消した流れは index row に記録済み。

## 受け入れ基準 (本 Sprint 24)

- `bun run test` **63/63** 緑 (コード変更なし)
- `bun run tsc --noEmit` クリーン
- `cargo test --lib` 未実行 (docs-only、backend 無変更; Sprint 23 baseline 48
  green を継続想定)
- plan.md に Sprint 24 Planning section 追加 (#16 / #17 design-weight 比較 +
  Sprint 25 着手判断 + 不採用理由の durable 記録)
- Sprint 17 / 18 / 19 の詳細 section が index row (3 行) に折り畳まれている
- preamble "Currently detailed" が `22 / 23 / 24` に更新
- Index table 見出しが "Sprint 3–20 summary index" に更新

## 変更コミット

| Commit | 内容 |
|--------|------|
| (docs) | このセクション + Sprint 17–19 index demotion + preamble 更新 + Commit discipline notes 新設 |

## Key decisions

- **Sprint 25 着手対象を #17 に確定するのは「user-visible value × TDD 摩擦
  最小 × Sprint 23 基盤活用」の積が決定打**: 影響頻度 (日本語 Excel ユーザーは
  毎 import) × RED が既に書かれている状態 × pure helper で macOS TDD が成立 ×
  PS 本体が static const なので emit 追加が 2 箇所で完結、の 4 点が揃う。
  #16 は 4 点のうち RED 未存在 + 3 OS 分岐で design surface が広い。
- **#16 を「後回し」ではなく「再評価 trigger 付きで保留」に格上げ**: Sprint 25
  完了時 (trigger ii) と production 報告 (trigger i) を durable に記録する
  ことで、曖昧な "TODO" ではなく「design-weight 評価済みだが優先度で後ろ」
  という確定ステータスに格上げ。planner が後で迷わない。
- **`sysinfo` crate を事前に却下**: 依存追加は「将来の planner が思いつく
  最短経路」の一つ。本 Sprint で「1 箇所の needs に対して過大」と durable に
  記録することで、Sprint 25+N の #16 着手時に planner が楽をして sysinfo を
  引っ張り込むのを防ぐ。
- **substring fallback の存廃は Sprint 25 終盤判断に**: #17 GREEN 時点で
  substring を即削除すると Windows 実機なしテスト (CI / macOS dev) の
  classification カバレッジが急減する。HRESULT 経路が確実に動く証拠が揃って
  から削除判断する方針。Sprint 23 の `validate_ps_arg` 削除は「env-var 経路が
  構造的排除」という強保証があったため即削除できた; substring はそれと同じ
  保証レベルがまだない。
- **docs-only Sprint を単独で切る価値**: Sprint 22 の先例通り、implementation
  Sprint に Planning を同梱すると (a) design judgement を急ぐ (b) 実装中に
  alternative が見えた時の sunk-cost bias が乗る。Sprint 24 で design を
  coolly 確定 → Sprint 25 で implementation に集中する分離は Sprint 22 → 23
  で実証済みの pattern。
- **housekeeping を Planning Sprint に束ねる判断**: Sprint 17–19 demotion は
  単体で Sprint を切るほどの重みがなく、かつ本 Sprint の docs commit に
  自然に束ねられる。「index demotion を忘れる」リスクを 1 commit 分の増分で
  閉じた。

## Follow-ups

- **Sprint 25**: 上記 Sprint Goal 草案に従い #17 を TDD で実装
  (Tidy → Tidy → RED → GREEN → Tidy → docs の 5〜6 commit)。
- **Sprint 25+N**: #17 完了後、#16 design-weight を再評価。本 Sprint の
  (a) OS native API 路線 + macOS cfg-gate fallback をベースに Planning を書く。
- **rule-of-three 監視**: 新規 duplicate 未観測。Sprint 25 で PS
  error-handling を触るため、`try/catch` パターンが複数箇所に現れる可能性
  あり。重複発生時は即 Tidy First に切り替え。
- **preamble "Currently detailed" drift 再発防止**: Sprint 25 追加時に
  `22 / 23 / 24` → `23 / 24 / 25` 更新 + Sprint 22 index demotion を同
  コミットで行うこと (本 Sprint で示した手順の踏襲)。

# Sprint 25 (2026-04-21) — #17 実装: HRESULT EXCEL_OPEN 分類

## Goal

Sprint 24 Planning の判断に従い、日本語ロケール Excel の COM 例外で
EXCEL_OPEN ダイアログが永久に発火しない問題を解決する。PS `try/catch` で
`$_.Exception.HResult` を `VERDE_HRESULT=0x{0:X8}` タグとして stderr に
emit し、Rust 側 pure parser + `ErrorKind` enum + `classify_hresult` が
タグを抽出して locale 非依存に分類する。Sprint 18 で pin した
negative-assertion を positive へ反転して契約を履行。

## Tidy First 分離

| 段階 | コミット | 種別 | 内容 |
|------|----------|------|------|
| 1 | `d6c2d88` | Tidy (構造のみ) | `parse_hresult_tag(stderr: &str) -> Option<i32>` を pure helper として追加 (hex / decimal / none の 3 tests)。`#[allow(dead_code)]` で一時的 dead にする — 挙動不変、48 → 51 Rust tests。 |
| 2 | `32be5c3` | Tidy (構造のみ) | `ErrorKind` enum (`ExcelOpen / PermissionDenied / NotFound / Unknown(i32)`) + `EXCEL_OPEN_HRESULTS` const + `classify_hresult` を追加 (4 tests)。こちらも未配線、挙動不変、51 → 55 Rust tests。 |
| 3 | `799f77e` | RED | Sprint 18 `is_excel_open_error_documents_known_japanese_locale_miss` を positive 方向に flip + `VERDE_HRESULT=0x80070020` を含む JP fixture に更新。substring 経路のみで HRESULT 未配線のため 1 failed 確定。 |
| 4 | `6578c40` | GREEN (挙動変更) | `is_excel_open_error` の先頭で `parse_hresult_tag` → `classify_hresult` を走らせ、`ErrorKind::ExcelOpen` なら true を返す経路を追加 (substring fallback は後続に残置)。PS scripts に `HRESULT_CATCH` 定数を注入し `concat!` で `EXPORT_SCRIPT` / `IMPORT_SCRIPT` を合成。catch は `Exception.InnerException.HResult` 優先 → `Exception.HResult` fallback → `throw` で rethrow (exit code は保存)。`#[allow(dead_code)]` 解除。RED test が GREEN に反転、55 passed。 |
| 5 | `8b86c72` | Tidy (後) | substring fallback 存廃判断。decision: **残す** — PS プロセスが try block 到達前に死ぬケース (process spawn 失敗 etc) ではタグが emit されない。2 pins を追加: (i) 非 EXCEL_OPEN HRESULT タグ (`E_ACCESSDENIED`) を拾わない、(ii) タグ無し英語 stderr は fallback で classify される。55 → 57 Rust tests。 |
| 6 | (docs) | docs | 本セクション + preamble 更新 + Sprint 22 index demotion + backlog #17 close。 |

## 実装の要点

### PS 側 `HRESULT_CATCH` (共有定数)

```powershell
} catch {
    $h = 0
    if ($_.Exception) {
        if ($_.Exception.InnerException -and $_.Exception.InnerException.HResult) {
            $h = $_.Exception.InnerException.HResult
        } elseif ($_.Exception.HResult) {
            $h = $_.Exception.HResult
        }
    }
    [Console]::Error.WriteLine(("VERDE_HRESULT=0x{0:X8}" -f $h))
    throw
```

`EXPORT_SCRIPT` / `IMPORT_SCRIPT` は Rust `concat!` macro で
`[body, HRESULT_CATCH, "} finally { ... }"]` を連結。`concat!` は stdlib
macro なので追加依存ゼロ (Sprint 22 Planning で検討した `tempfile` 追加案と
対照的)。`InnerException.HResult` 優先は `TargetInvocationException`
wrapping パターン (`.NET` が COM 例外を包む典型) をカバーするため。

### Rust 側 wiring

```rust
pub(crate) fn is_excel_open_error(err_msg: &str) -> bool {
    if let Some(hresult) = Self::parse_hresult_tag(err_msg) {
        if Self::classify_hresult(hresult) == ErrorKind::ExcelOpen {
            return true;
        }
    }
    // substring fallback は後続に残置 (Sprint 25 Tidy-after judgment)
    ...
}
```

HRESULT 経路を先に走らせ、非 EXCEL_OPEN HRESULT は fallback に落ちる。
`E_ACCESSDENIED` (0x80070005) は `PermissionDenied` に分類される =
ExcelOpen にはならない = fallthrough する = substring 非マッチで false。
commit 5 の 1 つ目の pin がこの invariant を固定。

## 受け入れ基準 (達成)

- `cargo test --lib` **57 passed** (Sprint 24 予測 55 に対し +2; Tidy-after の pin 2 件ぶん上振れ)
- `cargo clippy --lib -- -D warnings` クリーン
- `bun run test` **63/63** 緑 (frontend 無変更)
- `bun run tsc --noEmit` クリーン
- `rg 'VERDE_HRESULT=' src-tauri/` → PS `HRESULT_CATCH` 1 箇所 (export/import で共有) + Rust parser / tests で参照
- Sprint 18 pinned-negative test が positive 方向 GREEN
- plan.md preamble `Currently detailed: 23 / 24 / 25`、Sprint 22 index demotion 完了、backlog #17 クローズ

## Planning 予測との差分

- Sprint 24 予測 `+7 → 55 tests`。実測 `+9 → 57 tests`。差分は commit 5
  (Tidy-after) で pin した 2 件の intentional 追加。Sprint 24 Sprint Goal 草案
  で "substring fallback 存廃判断" とのみ書かれていた commit を、pure
  structural judgment (残置) + test pin 2 件へ具体化した結果。overrun ではなく
  judgement が structural test に落ちた形。
- Sprint 24 Sprint Goal 草案では commit 1 が `parse_hresult_tag`、commit 2 が
  `classify_hresult + ErrorKind` の順だった。履行通り。user プロンプトの
  paraphrase 順 (PS catch → enum) ではなく Sprint 24 Sprint Goal 草案順
  (pure helpers first) を優先した — PS 編集は stderr 内容を変えるため
  「構造のみ」の約束を崩す判断。
- `HRESULT_CATCH` を PS script 2 箇所で重複させず、`concat!` で共有する
  判断は草案になかった局所判断。`const_format` crate 検討 → stdlib `concat!`
  で十分と確認 → 採用。

## Key decisions

- **HRESULT 先・substring 後**: 経路優先順位を固定。`is_excel_open_error` の
  先頭で HRESULT 経路を走らせ、タグが無い or 非 EXCEL_OPEN HRESULT の場合に
  limited に substring fallback。逆順 (substring → HRESULT) にすると英語
  locale で false positive を拾ったときに HRESULT に訂正する経路が無い。
- **substring fallback を即削除しない**: Sprint 23 の `validate_ps_arg`
  削除は「env-var が構造的排除」という強保証があったため即削除可能だった。
  substring は HRESULT 経路が「PS catch が必ず実行される」保証の上で同じ
  強保証に到達するが、catch に入る前の process 失敗 (spawn error, PS startup
  失敗 etc) はタグを emit しない。Windows 実機 CI が無い今、「タグ無し経路でも
  分類できる」保険を残す判断。commit 5 の 2 つ目の pin がこの invariant を固定。
- **`concat!` macro で PS scripts を合成**: Sprint 23 で `format!` → `const`
  昇格時に `str::replace` 経路を導入したが、今回は placeholder substitution
  不要 (HRESULT_CATCH は 2 script で完全同一)。stdlib macro で依存追加ゼロ、
  Sprint 22 で却下した `tempfile` / Sprint 25 で検討した `const_format` と
  並んで「外部 crate を避ける」原則を履行。
- **`InnerException.HResult` 優先**: `.NET` は COM exception を
  `TargetInvocationException` で wrap することが多く、`$_.Exception.HResult` は
  wrap の HResult (典型: `0x80131604` `TargetInvocationException`) を返す。
  wrapped の内側に本物の COM HResult (`0x80070020` etc) が入っている。
  macOS 環境では Windows 実機を持たないため InnerException 優先ルールを
  durable 記録として Key decisions に置く。
- **`ErrorKind` enum 3 variants (PermissionDenied / NotFound / Unknown) は
  dead_code allow**: 分類自体は `classify_hresult` の pure tests で履行済み
  だが、UI branches が存在しない = 本番 production code で使われていない。
  `#[allow(dead_code)]` with comment を enum の内部 variant 単位で付けた
  (enum 全体の allow ではなく)。これで `ExcelOpen` variant が production で
  使われていることが dead_code 検知の観点から見える。将来 UI が branches を
  増やすときに allow を 1 件ずつ外す。

## KPT

### Keep
- **Tidy First を pure helper 先行で 2 commit に分割**: `parse_hresult_tag`
  と `classify_hresult + ErrorKind` を別 commit に分けた。Sprint 23 で
  `cf84fd8` (RED) / `9cc2c12` (GREEN) を明確に分離したのと同じ pattern を
  踏襲。helper の pure tests が先行することで、後続の GREEN で「配線だけ」に
  集中できた。
- **user プロンプトではなく Sprint 24 Sprint Goal 草案を優先**: user message
  は plan.md の paraphrase で commit 順 (PS catch 先) が逆だったが、「PS 編集
  は stderr 内容を変えるため Tidy First の『構造のみ』を破る」という理由で
  plan.md を優先。durable な planning doc が conversation-level な指示より
  上位、という Sprint 24 で確立した判断を履行。
- **Tidy-after で structural judgment を test pin に落とした**: Sprint 24
  Sprint Goal 草案の commit 5 "substring fallback の存廃判断" は曖昧な
  "judgment" commit になりそうだったが、`test(project): pin HRESULT path +
  substring fallback coexistence` という明確な structural commit に実現。
  "残す理由" が test の存在で可視化される。

### Problem
- **`#[allow(dead_code)]` の出入りが 2 commit に分散**: commit 1 で追加、
  commit 4 で削除したが、commit 2 でも新規追加 (enum + const) した。
  `ErrorKind` の内部 variants は結局 commit 4 でも残す形になった (UI branches
  が無いため)。当初「commit 4 で全部外せる」想定が実態と一致しなかった。
  Tidy First の commit 境界で `#[allow(dead_code)]` が行き来するのは
  小さい noise。
- **`concat!` への切替は local 判断で Planning になかった**: Sprint 24
  Sprint Goal 草案では PS scripts の edit 方法が未定義だった。`HRESULT_CATCH`
  共有は Sprint 25 実装中の局所判断。Planning 段階で PS script
  synthesis 方式を 1 行 pin しておけば commit 4 の implementation surface が
  小さくなっていた。Sprint 26+N Planning で PS-side changes を扱う場合に
  「合成方式 (concat! / str::replace / separate scripts) の事前判断」を checklist に。
- **日本語 locale の実機確認が未実施**: Sprint 24 design-weight で
  「macOS で full pure-helper TDD 成立」と記録したが、それは backed
  contract (parse + classify) の話。最終 `$_.Exception.HResult` が日本語
  Windows で実際に期待値 (`0x80070020`) を返すかは未検証。stakeholder 環境か
  Windows CI が整備されてから verify するしかない。Sprint 25 完了と
  production 検証を切り離す必要。

### Try
- **PS script synthesis 方式を Planning table で pin**: PS scripts を
  編集する Sprint の Planning で「edit 方式 (inline concat / replace /
  separate file)」を table の 1 行に記録する。Sprint 25 の `concat!` 判断は
  十分適切だったが、後続 planner が同じ局面で迷わないように pattern を
  durable 化。
- **`#[allow(dead_code)]` の出入りを commit boundary で意識的に管理**:
  Tidy First で追加→GREEN で削除、が理想。enum variants など部分的に残る
  ケースは variant 単位で allow を付ける (全体 allow ではなく) 慣習を継続。
- **Windows 実機 verification を Sprint 25+N の明示タスクに**: production
  deploy / stakeholder テスト環境で (i) 日本語 Excel で import 失敗時に
  `VERDE_HRESULT=0x80070020` が stderr に出るか、(ii) UI が EXCEL_OPEN
  ダイアログを出すか、を verify。出来なければ `InnerException.HResult`
  優先ロジックの調整が必要。Sprint 25 単体では macOS で書ける範囲で
  GREEN に到達し、実機 verify は post-Sprint follow-up に。

## Follow-ups

- **Windows 実機 verification**: stakeholder テスト環境で
  (i) `VERDE_HRESULT=0x80070020` emit、(ii) UI EXCEL_OPEN ダイアログ発火 を
  verify。失敗時は HRESULT 抽出ロジック (`InnerException.HResult` 優先) 要調整。
- **Sprint 26+N: #16 (lock staleness) 着手**: Sprint 24 の (a) OS native API
  路線 + macOS cfg-gate fallback を base に Planning Sprint。Sprint 22 → 23 と
  同じ Planning / 実装分離 pattern を踏襲。
- **`ErrorKind::PermissionDenied` / `NotFound` UI wiring**: 現在 `#[allow(dead_code)]`
  で保護されている variants に UI branches を足す際に allow 1 件ずつ外す。
  production で `classify_hresult` 経路が HRESULT を 3 kinds に分類する
  利点を UX に還元する追い込み作業。rule-of-three 未到達のため rule に
  束縛されない — product signal を待つ。
- **substring fallback の最終削除**: Windows CI で
  `VERDE_HRESULT=0x80070020` emit を E2E verify できるようになったら
  substring を削除。Sprint 23 `validate_ps_arg` 削除と同じ強保証レベルに
  到達したタイミング。

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

