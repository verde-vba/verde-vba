# Verde — Sprint History and Backlog (plan.md)

Compressed record of Sprints 3–17 plus consolidated follow-up backlog.

**Plan-bloat prevention policy (from Sprint 16):** at any time, only the
three most recent *decision-bearing* sprints are retained in full detail.
All earlier sprints collapse to one-line rows in the index table below —
`git log` + sprint tags are the authoritative source for their
commit-level detail. Compression-only sprints (like Sprint 16 itself) do
not consume a detail slot, and probe-only refinement sprints occupy one
slot at whatever density their outcome requires (often < 50 lines).
Currently detailed: Sprint 26 / 27 / 28. A planner adding a new sprint
section must demote the now-oldest detailed sprint into the index row in
the same commit. Sprint 17–19 were folded into index rows during Sprint
24 housekeeping (closing a pre-existing detail-drift). Sprint 23 was
demoted during Sprint 26 housekeeping. Sprint 24 was demoted during
Sprint 27 housekeeping. Sprint 25 was demoted during Sprint 28
housekeeping.

## Sprint 3–25 summary index

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

# Sprint 26 (2026-04-21) — #16 lock staleness 設計具体化 + Sprint 27 Sprint Goal 草案

## Goal

Sprint 24 で design-weight 比較の base line として durable 採択された
「(a) OS native API + macOS cfg-gate fallback」を受け、Sprint 22→23 の
Planning / 実装分離 pattern を踏襲する。3 OS (Windows / Linux / macOS) の
API 経路、TDD 可能性、pinned-negative signal、Sprint 27 で実行する commit
分割を具体化し、Sprint 27 Sprint Goal 草案を書き下す。**docs-only、コード
変更なし**。Sprint 24 で却下された選択肢 (`sysinfo` crate / `libproc` FFI /
`ps -p` shell-out) は蒸し返さない — 本 Sprint の責務は「base line の具体化」
であり、Approach 選定の再評価ではない。

## Probes executed (Sprint start)

1. `rg '!\.' src/` → 0 hits
2. `rg 'as\s+[A-Z]' src/ --type ts` → test 1 件 (ガード付き正当 assertion、保持)
3. `rg '@ts-ignore|@ts-expect-error' src/` → 0 hits
4. Rule-of-three 再確認 (Sprint 25 PS error-handling 追加後): `rg 'try\s*\{|catch\s*\{' src-tauri/src/` → `vba_bridge.rs:31` (`HRESULT_CATCH` catch 本体) / `:52` (`EXPORT_SCRIPT` try) / `:89` (`IMPORT_SCRIPT` try)。catch 本体は `concat!` で 2 script に共有されており **Rust source 上の定義は 1 箇所のみ** (rule-of-three threshold 3 未到達、1 / 3)。try body 2 箇所は workflow が異なり共通化 surface なし。
5. Baseline: Rust **57** passed (Sprint 25) / Frontend **63** passed。

## Priority selection

- A (type-bypass): arc 維持 → skip
- B (#16 design 具体化): **採用** — Sprint 25 Follow-ups の durable 指示
- C (rule-of-three): 未到達 → 監視継続

## 現行 lock 機構の source-line pin

`src-tauri/src/lock.rs`:

| line | 要素 | 現挙動 |
|------|------|--------|
| 18 | `const LOCK_STALE_AFTER_HOURS: i64 = 24 * 7` | 7日 TTL (Sprint 18 の Windows PID reuse 保険) |
| 33–40 | `is_stale_by_ttl` pure helper | RFC3339 parse → 経過時間 > 168h で stale。parse 失敗は **not stale** (conservative) |
| 134–145 | `is_pid_alive` Windows branch | `OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid)` 成功なら alive。`CloseHandle` で drop。 |
| 147–150 | `is_pid_alive` 非 Windows branch | `libc::kill(pid as i32, 0) == 0` (POSIX signal 0 probe) |
| 164–172 | `is_stale` | `same_machine ? (!is_pid_alive(pid) \|\| ttl_expired) : ttl_expired`。PID reuse 時の wedge を TTL が 7日で救う構造。 |

**現行 gap**: `is_pid_alive` は PID 占有プロセスの「正体」を見ない。Verde crash
後に Explorer 等が同一 PID を再割当すると 7 日間 wedge する。`lock.rs:5–17`
の doc comment は既にこの gap を follow-up #16 として名指ししている。

## 3 OS Approach の設計詳細化

### Windows: `QueryFullProcessImageNameW`

- HANDLE は既存 `OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, ...)` を再利用。
  Sprint 18 で `Cargo.toml` に `Win32_System_Threading` feature を有効化済み
  (`QueryFullProcessImageNameW` は同モジュール配下) — **追加 feature flag 不要**。
- 呼び出し経路 (概念コード):
  ```rust
  #[cfg(windows)]
  fn process_image_basename(pid: u32) -> Option<String> {
      use windows::Win32::System::Threading::{
          OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_FORMAT,
          PROCESS_QUERY_LIMITED_INFORMATION,
      };
      unsafe {
          let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
          let mut buf = [0u16; 260];
          let mut len = buf.len() as u32;
          let ok = QueryFullProcessImageNameW(h, PROCESS_NAME_FORMAT(0), &mut buf, &mut len);
          let _ = windows::Win32::Foundation::CloseHandle(h);
          ok.ok()?;
          let full = String::from_utf16_lossy(&buf[..len as usize]);
          Path::new(&full)
              .file_name()
              .map(|n| n.to_string_lossy().to_lowercase())
      }
  }
  ```
- **エラー → stale 判定**: `OpenProcess` 失敗 (PID dead / Access denied) = None =
  `is_stale_by_image_match(None, ...)` が true 判定。Access denied は同ユーザー
  + `PROCESS_QUERY_LIMITED_INFORMATION` 権限で稀。稀なケースでは TTL fallback が
  最終保険になる (後述 Key decision 参照)。
- **比較対象**: `"verde.exe"` (lowercase)。拡張子含みで比較 (Windows 慣例)。

### Linux: `/proc/<pid>/comm`

- `std::fs::read_to_string(format!("/proc/{}/comm", pid))` で読み取り → 末尾改行
  trim → lowercase。
- Linux カーネルは `TASK_COMM_LEN = 16` で切る (15 char + NUL)。basename
  `"verde"` は 5 char で余裕。
- `/proc/<pid>/exe` の `readlink` はフルパスを返すが **権限依存** (matching uid
  または `CAP_SYS_PTRACE` 必要)。**採用は `comm` のみ** — basename 比較で要件
  充足、権限問題回避。
- **エラー分類**:
  - ENOENT (file not found) → PID dead → None 返却 → stale
  - EACCES/EPERM (permission denied) → 判定保留のため None 返却 → stale。
    同ユーザー local lock では稀。
- **比較対象**: `"verde"` (Linux ビルドは拡張子なし)。

### macOS: cfg-gate fallback (Sprint 24 durable 採択の具体化)

- `#[cfg(target_os = "macos")]` の `process_image_basename` は **常に `None` を
  返す**。
- ただし `None` を `is_stale_by_image_match(None, ...)` に直接渡すと macOS で
  same_machine + PID alive の legitimate lock まで stale 誤判定する。→ 本
  Sprint で `is_stale_with_provider` の **別経路** を設計:
  `provider(pid) == None` の場合は image-name 判定 **を skip** し、既存
  `is_pid_alive + TTL` 経路に fallback。
- この設計で macOS は behavioral 変化ゼロ (Sprint 18 と同一)、Windows/Linux は
  image-name 比較が有効化。**provider の `None` には「未検証」と「検証済みで
  mismatch」の 2 意味が必要**: 前者は fallback、後者は stale。
  → provider 返却型を `Option<Result<String, ProviderError>>` で扱うか、
  `Option<String>` + OS cfg で意味を切り分ける 2 案あり。**採用**: 後者
  (OS cfg gate で意味を切り分け) — 型は最小、Windows/Linux では `None` は
  常に「検証済み not-us」、macOS では `None` は常に「検証不可」という
  invariant を cfg で担保。Sprint 27 commit 2 で doc comment に明記。
- 却下選択肢 (再掲、Sprint 24 durable):
  - `libproc` crate (`proc_pidpath` FFI) — macOS dev-only で crate 追加代償過大
  - `ps -p <pid> -o comm=` shell out — Sprint 23 で PS 引数 escape を構造的
    排除した文化に反する (shell 依存 + locale 差 + escape surface 再発)

### 共通: image-name 照合仕様

- OS 別 expected basename:
  ```rust
  #[cfg(windows)]             const EXPECTED_BASENAME: &str = "verde.exe";
  #[cfg(target_os = "linux")] const EXPECTED_BASENAME: &str = "verde";
  #[cfg(target_os = "macos")] const EXPECTED_BASENAME: &str = "verde"; // 未使用 (fallback 経路)
  ```
- Pure helper: `fn is_stale_by_image_match(observed: Option<&str>, expected: &str) -> bool`
  - `None` → `true` (検証済み not-us; Windows/Linux context 前提)
  - `Some(name)` where `name.eq_ignore_ascii_case(expected)` → `false`
  - `Some(name)` where名 mismatch → `true` (PID reuse 検知)

## TDD 可能性の評価

### macOS で書ける単体テスト

`is_stale_by_image_match` の pure tests (4 件予定):

| input | expected | 理由 |
|-------|----------|------|
| `None`, `"verde.exe"` | `true` | PID dead / Access denied = not-us |
| `Some("verde.exe")`, `"verde.exe"` | `false` | basename match |
| `Some("VERDE.EXE")`, `"verde.exe"` | `false` | case-insensitive match |
| `Some("explorer.exe")`, `"verde.exe"` | `true` | PID reuse 検知 |

Provider 注入テスト (macOS 上で integration-flavored):

- `is_stale_with_provider(info, provider: fn(u32) -> Option<String>, now: DateTime<Utc>)` を
  `lock.rs` に切り出し。stub provider で全 cfg OS の挙動を macOS 上で RED → GREEN
  可能。
- Case 1: `provider = |_| Some("explorer.exe".into())` + same_machine + PID alive
  + within TTL → `true` (commit 3 RED → commit 4 GREEN で反転)
- Case 2: `provider = |_| Some("verde".into())` + 同条件 → `false`
- Case 3: `provider = |_| None` + same_machine + PID alive + within TTL →
  `false` (macOS fallback 経路)。TTL expired → `true`。

### Windows/Linux 実機テストの扱い

- 実機 CI が無い前提。FFI 本体 (`QueryFullProcessImageNameW` / `/proc/<pid>/comm`
  read) は unit test でカバー不可。
- Sprint 27 では本体を platform-gated smoke test で **自プロセス PID** に対して
  呼び、basename が non-empty であることのみ assert。basename 値は test runner
  名 (`cargo-nextest` / `verde-*` 等) を含むため「`verde` prefix 強制」はしない。
- Windows 実機 verification は Sprint 25 と同じく post-implementation follow-up。

### Pinned-negative signal の扱い

- Sprint 24 で #17 採択理由の 1 つは「Sprint 18 に pinned-negative 遺産が
  あった」。#16 は RED 遺産なし。
- 本 Sprint の durable decision: Sprint 27 commit 3 で **新規 RED を意図的に
  書き下ろす** — `is_stale_reaps_same_machine_alive_pid_with_foreign_image`。
  provider stub で `Some("explorer.exe")` を返し、same_machine + PID alive +
  within TTL で `true` を assert。commit 4 で wiring が入るまで RED。Sprint 25
  の JP-locale pin 反転と同じ Red→Green 骨格を踏襲。

## Sprint 27 Sprint Goal 草案

**Goal**: `lock.rs` に `is_stale_by_image_match` pure helper + `process_image_basename`
3-OS cfg-gate provider + `is_stale_with_provider` 拡張版を追加し、`is_stale` を
provider 経由委譲にリファクタ。Windows PID reuse wedge を構造的に排除し、
Linux も同等、macOS は provider `None` 判定で既存 `is_pid_alive + TTL` fallback
経路を維持する (behavioral 変化ゼロ)。Sprint 27 Day 1 の RED は本 Sprint で
設計した `is_stale_reaps_same_machine_alive_pid_with_foreign_image`。

### Tidy First 分離 (Sprint 23 / 25 と同形 5-6 commit)

| 段階 | コミット種別 | 内容 |
|------|-------------|------|
| 1 | Tidy (構造のみ) | `is_stale_by_image_match(observed: Option<&str>, expected: &str) -> bool` pure helper + OS 別 `EXPECTED_BASENAME` const を追加。+4 unit tests (None / match / case-insensitive / mismatch)。`#[allow(dead_code)]` で未配線。挙動不変、57 → 61 Rust tests。 |
| 2 | Tidy (構造のみ) | `process_image_basename(pid: u32) -> Option<String>` provider (3 OS cfg-gate) を追加。Windows: `QueryFullProcessImageNameW` wrapper / Linux: `/proc/<pid>/comm` reader / macOS: `None` 固定。cfg 毎に 1 smoke test (自プロセス PID で basename non-empty on Win/Linux、`None` on macOS)。doc comment に「None の意味は cfg で切り分け」invariant を明記。挙動不変、61 → 63 Rust tests。 |
| 3 | RED | `is_stale_with_provider(info, provider, now)` 関数 signature を追加 (wiring 未接続)。`is_stale_reaps_same_machine_alive_pid_with_foreign_image` テストを追加 — provider stub = `Some("explorer.exe")`、same_machine + PID alive (= `std::process::id()`) + recent `locked_at` で `is_stale_with_provider` が `true` を返すことを assert。provider 結果を使わない暫定実装のため RED 確定 (1 failed)。63 → 64 Rust tests (RED)。 |
| 4 | GREEN (挙動変更) | `is_stale_with_provider` の本体を完成 — `same_machine && is_pid_alive` branch で provider 呼び出し → `Some(name)` なら `is_stale_by_image_match(Some(&name), EXPECTED_BASENAME)` → `None` なら TTL 経路に fallback (macOS 互換)。`is_stale` を `is_stale_with_provider(info, process_image_basename, Utc::now())` への delegator に置換。`#[allow(dead_code)]` 解除。RED が GREEN に反転、64 passed。 |
| 5 | Tidy (後) | macOS fallback 経路の pin: `is_stale_macos_fallback_respects_ttl` — provider stub = `\|_\| None`、same_machine + PID alive + within TTL → `false`、TTL expired → `true` を assert。Sprint 25 Tidy-after と同じ「judgment を test で可視化」pattern。`None` の 2 意味 (未検証 vs 検証済み not-us) を cfg で切り分ける invariant が regress しないよう pin。64 → 65 Rust tests。 |
| 6 | docs | Sprint 27 retrospective + preamble `24 / 25 / 26` → `25 / 26 / 27` 更新 + Sprint 24 index demote + backlog #16 close。 |

### Test 予算 (予測)

- Commit 1: +4 (`is_stale_by_image_match` pure tests)
- Commit 2: +2 (provider smoke, platform-gated)
- Commit 3: +1 RED (commit 4 で GREEN)
- Commit 5: +1 pin
- **予測 delta: +8 → 65 Rust tests**

Sprint 23 は `-9 → 48`、Sprint 25 は `+9 → 57`。Sprint 27 予測 `+8 → 65` は
Sprint 25 precision と同レンジ。

### Sprint 27 受け入れ基準 (予測)

- `cargo test --lib` **65 passed** (予測)
- `cargo clippy --lib -- -D warnings` クリーン
- `bun run test` **63/63** 緑 (frontend 無変更)
- `bun run tsc --noEmit` クリーン
- RED pin (`is_stale_reaps_same_machine_alive_pid_with_foreign_image`) が GREEN
- macOS fallback pin (`is_stale_macos_fallback_respects_ttl`) で provider `None`
  → TTL 経路が durable
- `rg 'process_image_basename' src-tauri/` → `lock.rs` に cfg-gate 実装 + tests

## Housekeeping — Sprint 23 index demotion

本 Sprint で Sprint 23 の詳細 section を「Sprint 3–23 summary index」の 1 行
row へ折り畳み、plan-bloat rule ("3 most recent detailed") を維持。保全された
情報:

- **#15 実装の commit 経路** (`4c00585` Tidy / `cf84fd8` RED / `9cc2c12` GREEN /
  `f3dbd32` docs) は index row + `git show` で参照可能。
- **env-var マッピング 4 件** (`VERDE_XLSM_PATH` / `VERDE_OUTPUT_DIR` /
  `VERDE_MODULE_NAME` / `VERDE_MODULE_PATH`) は `vba_bridge.rs` source を
  grep すれば現物として読める。
- **`.env_clear()` 不使用の durable 判断** と **denylist 完全削除の理由** は
  index row の key decisions 欄に保全。再登場時は `git show 9cc2c12` で
  commit-level 詳細を参照。
- **HEREDOC `\$env` escape drift の教訓**: `# Commit discipline notes`
  section (本ファイル下部) に standing convention として既に昇格済み。

## 受け入れ基準 (本 Sprint 26)

- `bun run test` **63/63** 緑 (コード変更なし)
- `bun run tsc --noEmit` クリーン
- `cargo test --lib` 未実行 (docs-only、backend 無変更; Sprint 25 baseline 57
  passed を継続想定)
- plan.md に Sprint 26 Planning section 追加 (3 OS Approach 詳細 + Sprint 27
  Sprint Goal 草案 + 不採択理由の durable 記録)
- Sprint 23 の詳細 section が index row に折り畳まれている
- preamble "Currently detailed" が `24 / 25 / 26` に更新
- Index table 見出しが "Sprint 3–23 summary index" に更新
- backlog #16 row が "Planning 完了 (Sprint 26) / 実装 Sprint 27" に更新
- Sprint 25 Follow-ups の #16 bullet が Sprint 26 完了 / Sprint 27 着手 を反映

## 変更コミット

| Commit | 内容 |
|--------|------|
| (docs) | このセクション + Sprint 23 index demotion + preamble `24 / 25 / 26` 更新 + backlog #16 / Sprint 25 Follow-up の #16 bullet 更新 |

## Key decisions

- **Sprint 24 durable 採択 (a) の「具体化」に責務を限定**: `sysinfo` crate /
  `libproc` FFI / `ps -p` shell-out は Sprint 24 で durable に却下済み。本 Sprint
  は API 経路 / TDD 戦略 / commit 分割を詰めるだけ。planner が後で迷わない
  ための durable pattern (Sprint 22→23 で確立)。
- **Linux は `/proc/<pid>/comm` のみ採用 (`/exe` はスキップ)**: permission-dependent
  な `/exe` は local-user lock 要件に対して overhead。`comm` の
  `TASK_COMM_LEN=16` 制限は `verde` (5 char) に対して余裕。将来 basename 衝突
  リスク (`verde-helper` 等) が実体化したら `/exe` 追加を検討 (rule-of-three 風
  に「実衝突 3 例」で surface してから)。
- **provider 返却型 `Option<String>` + OS cfg で `None` の意味を切り分け**:
  Windows/Linux では `None` = 「検証済み not-us」、macOS では `None` =
  「検証不可 (fallback)」。型を `Option<Result<String, _>>` に昇格させる案より
  invariant が見える範囲を 1 関数内に閉じ込められる。Sprint 27 commit 2 doc
  comment で明記し、commit 5 の macOS fallback pin で regress 防止。
- **macOS fallback は behavioral 変化ゼロ**: Sprint 18 の `is_pid_alive + TTL`
  と完全同一。`is_stale_with_provider` 内で provider 返却が `None` の場合に
  image-name 判定を **skip** し TTL 経路に落ちる分岐が invariant。Sprint 27
  commit 4 実装時にこの分岐を落とすと macOS legitimate lock を全部 reap する
  誤設計になる — 落とし穴を本 Planning で明示化。
- **Pinned-negative signal を Sprint 27 commit 3 で意図的に新規作成**: Sprint 24
  は #17 に既存 RED (Sprint 18 遺産) があったことを採択理由に挙げた。#16 は
  RED 遺産なし。Sprint 27 で **新規 RED** を commit 3 で書き下ろすことで、
  Sprint 25 と同じ Red→Green 骨格を再現。「RED 遺産の有無に関わらず TDD 骨格
  は同形」という durable pattern。
- **`is_stale_with_provider` 拡張は fn pointer / closure 注入で行う**:
  trait 化より軽量。Rust の `fn(u32) -> Option<String>` 型で十分なテスト可能性
  を得る (Sprint 23 の `Command::env` と同じ「最小表面」原則)。将来 provider
  が state を持つ必要が surface したら trait 昇格判断。
- **`QueryFullProcessImageNameW` feature flag 追加不要**: Sprint 18 で
  `Win32_System_Threading` を有効化済み。`QueryFullProcessImageNameW` は同
  モジュール配下のため Cargo.toml 変更なしで呼び出せる。Sprint 27 の commit
  表面が `Win32_Foundation` + `Win32_Storage_FileSystem` を触らずに済む。
- **docs-only Sprint を単独で切る価値 (Sprint 22 / 24 と同根拠)**: implementation
  に Planning を同梱すると (a) design judgement を急ぐ (b) 実装中の alternative
  検出時に sunk-cost bias が乗る。Sprint 26 で design を coolly 確定 → Sprint 27
  で implementation に集中する分離は Sprint 22→23、Sprint 24→25 で 2 回実証
  済みの pattern。

## Follow-ups

- **Sprint 27 (完了)**: 上記 Sprint Goal 草案を 6 commit で履行 (`9288277` Tidy
  1 / `9c55913` Tidy 2 / `3045fb0` RED / `8d6df43` GREEN / `629de6e` Tidy-after
  / 本 docs commit)。実績は `+7 → 64` Rust tests on macOS host (予測 +8 → 65 から
  -1; cfg-gated smoke tests の host-specific compile により予測が overcount)。
  詳細は Sprint 27 retrospective section 参照。
- **Windows / Linux 実機 verification (post-Sprint 27)**: stakeholder / CI 環境
  で (i) `process_image_basename` が実プロセス名を返すか、(ii) PID reuse
  シナリオを意図的に再現して image-name mismatch で stale 判定されるかを
  verify。Sprint 25 の日本語 locale verification と並行 backlog。
- **`/proc/<pid>/exe` への降格判断**: `verde-cli` / `verde-helper` 等 basename
  衝突が実体化したら Linux provider を `/exe` readlink に差し替え。rule-of-three
  風に「実衝突の 3 例」が surface してから。
- **rule-of-three 監視**: 本 Sprint probe で PS `try/catch` は `concat!` 共有
  により Rust source 上 1 定義のみ (1 / 3)。Sprint 27 で `lock.rs` に cfg-gate
  provider を追加すると既存 `is_pid_alive` の cfg-gate pattern と構造が近い
  (2 / 3 相当)。3 目が surface したら cfg-gate helper 共通化を Tidy 対象に。
- **preamble "Currently detailed" drift 再発防止**: Sprint 27 docs commit で
  `24 / 25 / 26` → `25 / 26 / 27` 更新 + Sprint 24 index demotion を同コミット
  で行う。Sprint 26 で確立した 3-sprint sliding window 手順の踏襲。

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

