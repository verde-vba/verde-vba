# Verde — Sprint History and Backlog (plan.md)

Compressed record of Sprints 3–17 plus consolidated follow-up backlog.

**Plan-bloat prevention policy (from Sprint 16):** at any time, only the
three most recent *decision-bearing* sprints are retained in full detail.
All earlier sprints collapse to one-line rows in the index table below —
`git log` + sprint tags are the authoritative source for their
commit-level detail. Compression-only sprints (like Sprint 16 itself) do
not consume a detail slot, and probe-only refinement sprints occupy one
slot at whatever density their outcome requires (often < 50 lines).
Currently detailed: Sprint 22 / 23 / 24. A planner adding a new sprint
section must demote the now-oldest detailed sprint into the index row in
the same commit. Sprint 17–19 were folded into index rows during Sprint
24 housekeeping (closing a pre-existing detail-drift).

## Sprint 3–20 summary index

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
| 16  | Image-name-based lock staleness (Windows + Linux)                  | S18         | Windows COM/Win32 + Linux procfs expertise on hand |
| 17  | HRESULT-based EXCEL_OPEN classification (locale-agnostic)          | S18         | COM error-code extraction pathway (blocked on `vba_bridge` rewrite in #15) |

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

# Sprint 22 (2026-04-21) — #15 Planning: PS 引数渡しアーキテクチャ設計

## Goal

#15 実装の設計判断を確定し、次 Sprint で直接着手できる Planning ドキュメントを
残す。コード変更なし。docs commit 1 本で完了。

## Probes executed (Sprint start)

1. `rg '!\.' src/` → 0 hits
2. `rg 'as\s+[A-Z]' src/ --type ts` → test 1件 (error-parse.test.ts:133、ガード付き正当 assertion、保持)
3. `rg '@ts-ignore|@ts-expect-error' src/` → 0 hits
4. `rg '\bany\b' src/ --type ts` → `expect.any(Error)` とコメントのみ
5. rule-of-three:
   - `useTranslation`: 全コンポーネントで標準使用、抽出不要
   - `role=`: dialog×3 / status×1 / alert×1 — 異種 ARIA role、統一不要
   - `useSave handleSave` null-guard: 1箇所のみ、rule-of-two 未満

## Priority selection

- A: arc 維持 → skip
- B: #15 Planning 実行 ← **採用**
- C: rule-of-three 未到達 → 監視メモ追記のみ

## #15 アプローチ比較

### 現状 (Approach 0 — baseline)

```rust
let script = format!(r#" ... $excel.Workbooks.Open("{xlsm_path}") ... "#);
Command::new("powershell").args(["-Command", &script])
```

ユーザー入力 (`xlsm_path`, `output_dir`, `module_name`, `module_path`) が
PowerShell コード文字列に `format!` で埋め込まれる。
`validate_ps_arg` が `"`, `` ` ``, `$`, `;` 等を拒否することで injection を緩和。

**根本問題**: 注入を「緩和」しているが「根絶」していない。
Unicode パス (日本語ファイル名) が `validate_ps_arg` に弾かれる既知の制限あり。

---

### Approach 1 — 環境変数経由 【推奨】

```rust
const EXPORT_SCRIPT: &str = r#"
$xlsmPath  = $env:VERDE_XLSM_PATH
$outputDir = $env:VERDE_OUTPUT_DIR
$excel = New-Object -ComObject Excel.Application
...
$wb = $excel.Workbooks.Open($xlsmPath)
...
$filepath = Join-Path $outputDir $filename
"#;

Command::new("powershell")
    .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", EXPORT_SCRIPT])
    .env("VERDE_XLSM_PATH", xlsm_path)
    .env("VERDE_OUTPUT_DIR", output_dir)
    .output()?
```

**仕組み**: Rust が OS の env var チャネル経由で値を渡す。
PS スクリプト本体は完全な静的定数。ユーザー入力がコードとして解釈される経路がゼロ。

**利点**:
- injection surface ゼロ（緩和ではなく構造的排除）
- Unicode パス対応 (`validate_ps_arg` が除去されるため日本語ファイル名が通る)
- `validate_ps_arg` 関数と 8件のユニットテストを削除 → コード削減
- 一時ファイル不要、依存追加なし

**欠点**:
- 環境変数は子プロセスに継承される（ただし PS が唯一の直接子プロセス）
- Windows 環境変数の最大長 32767 chars/var — 通常のパスは問題なし

**TDD on macOS で書けるテスト**:
- `validate_ps_arg` 8件 → **削除**
- injection テスト 2件 (`export_rejects_injected_...`, `import_rejects_injected_...`) → **削除** (injection が構造的に不可能になるため)
- 非 Windows 正常テスト 2件 → **維持** (returns "requires Windows")
- 新規: 空文字列の early-fail 挙動は PS に任せる (COM エラーとして伝播)
- Windows 実行テスト: macOS から書けない (変わらず)

**テスト収支**: -10件 (削除) ± 0 (追加なし) ＝ 合計 55 - 10 = 45 Rust tests

---

### Approach 2 — `-File` + 一時スクリプトファイル

```rust
let tmp = tempfile::NamedTempFile::new()?;
write!(tmp, "{}", EXPORT_SCRIPT)?;
Command::new("powershell")
    .args(["-NoProfile", "-ExecutionPolicy", "Bypass",
           "-File", tmp.path().to_str().unwrap(),
           "-XlsmPath", xlsm_path, "-OutputDir", output_dir])
    .output()?
```

PS スクリプトに `param([string]$XlsmPath, [string]$OutputDir)` を追加し、
`-File` でファイル名指定呼び出し。`-File` は named param binding を確実に行う。

**欠点**:
- `tempfile` crate 追加が必要 (または `std::env::temp_dir()` 手書き管理)
- クラッシュ時に一時ファイルが残留するリスク
- ファイル作成/削除のエラーハンドリング +30行

**判断**: Approach 1 と injection 排除効果は同等だがコスト大。採用しない。

---

### Approach 3 — 現状維持 + escape 強化

`validate_ps_arg` の許可文字を拡張、または PS エスケープ (`` ` `` で `"` を無害化)。

**欠点**:
- injection surface を「縮小」するだけで根絶しない
- Unicode パス問題が残存
- エスケープロジックのバグが直接 RCE につながる

**判断**: セキュリティ改善の方向性として不適切。採用しない。

## 採択: Approach 1 (環境変数経由)

| 比較軸 | Approach 1 | Approach 2 | Approach 3 |
|--------|-----------|-----------|-----------|
| injection 根絶 | ✅ | ✅ | ❌ |
| Unicode パス | ✅ | ✅ | ❌ |
| コード増減 | ▼ 削減 | ▲ 増加 | ≈ 同等 |
| 一時ファイル | なし | あり | なし |
| macOS TDD | テスト減 | テスト増 | テスト維持 |

## 次 Sprint (Sprint 23) 実装計画

### Tidy First 原則: 構造変更と挙動変更を分離

**Commit 1 — 構造変更 (no behavior change)**
- `EXPORT_SCRIPT` / `IMPORT_SCRIPT` を static `const` に昇格
- スクリプト本体を `format!` から切り出す (変数参照形式はまだ `{xlsm_path}`)
- テスト: 変化なし、55 Rust tests green

**Commit 2 — 挙動変更 RED: 空文字 early-fail の新テスト (optional)**
- 現行: `validate_ps_arg` が "must not be empty" を返す
- 新仕様: 空文字は `export`/`import` 先頭で `Err("xlsm_path must not be empty")` を返す
- macOS で書けるテストとして残す場合は RED → GREEN

**Commit 3 — 挙動変更 GREEN: env-var 移行 + validate_ps_arg 削除**
- `format!` を静的スクリプト文字列に置換
- `$env:VERDE_*` 参照に書き換え
- `.env("VERDE_XLSM_PATH", xlsm_path)` 等を Command に追加
- `validate_ps_arg` 関数と injection テスト群を削除
- `cargo test --lib`: 45 passed (expected -10 from deleted validator tests)

### 環境変数名ポリシー

| PS 変数参照 | Rust env key | 用途 |
|------------|-------------|------|
| `$env:VERDE_XLSM_PATH` | `VERDE_XLSM_PATH` | export / import |
| `$env:VERDE_OUTPUT_DIR` | `VERDE_OUTPUT_DIR` | export のみ |
| `$env:VERDE_SOURCE_DIR` | `VERDE_SOURCE_DIR` | import のみ |
| `$env:VERDE_MODULE_NAME` | `VERDE_MODULE_NAME` | import のみ |
| `$env:VERDE_MODULE_PATH` | `VERDE_MODULE_PATH` | import のみ |

`VERDE_` prefix で他プロセスの env vars との衝突を回避。

## 変更コミット (今 Sprint)

| Commit  | 内容 |
| ------- | ---- |
| (docs)  | このセクション (Planning memo + Sprint 22 retrospective) |

## 受け入れ基準 (今 Sprint)

- `bun run test` 63/63 緑 (変化なし)
- `bun run tsc --noEmit` クリーン
- plan.md に #15 設計判断が記録されている

## Follow-ups

- Sprint 23: Approach 1 (env-var) を上記実装計画に従い TDD で実装。
- #16 (lock staleness) / #17 (HRESULT EXCEL_OPEN): 依然 blocked / heavy。
  #15 完了後に改めて design-weight を評価。
- rule-of-three: 次の監視対象なし。新規コンポーネント / hook 追加時に再評価。

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

