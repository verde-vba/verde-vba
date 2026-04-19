# Verde — 設計仕様書 v2.1

## 1. プロジェクト概要

ExcelのVBAマクロを開発するためのAIネイティブなデスクトップアプリケーション。
VBE（Visual Basic Editor）の代替として、モダンなエディタ体験とAIからの
コードアクセスを提供する。

- **プロジェクト名**: Verde
- **由来**: VBA + Editor の音。スペイン語で「緑（フレッシュ）」
- **ライセンス**: MIT
- **公開形態**: OSS（GitHub Organization: `verde-vba`）
- **ターゲット**: 広く一般公開。スキルレベルは問わない
- **プラットフォーム**: Windows x64

---

## 2. リポジトリ構成

`verde-vba` Organization 配下に**別リポジトリ**として分離する。モノレポではない。

```
verde-vba/
├── verde              # Tauri デスクトップアプリ（Rust backend + Web frontend）+ MCP サーバー（Node.js）
├── verde-lsp          # VBA Language Server（Rust, 単体クレート）
└── (将来) vscode-verde # VS Code 拡張（LSPクライアントのみの薄いラッパー）
```

### パッケージ名

| 場所 | 名前 |
|------|------|
| GitHub | `verde-vba/verde`, `verde-vba/verde-lsp` |
| crates.io | `verde-lsp` |
| npm (MCP) | `@verde-vba/mcp` |
| GitHub Releases | `verde-x86_64-windows.msi` |

---

## 3. アーキテクチャ全体像

```
┌──────────────────────────────────────────────────────────────────┐
│  Windows                                                        │
│                                                                  │
│  ┌──────────────────┐    stdio    ┌──────────────────────┐      │
│  │ Verde            │◄───────────►│ verde-lsp (Rust)     │      │
│  │ (Tauri v2)       │             │ - 定義ジャンプ        │      │
│  │                  │             │ - 補完                │      │
│  │ ┌──────────────┐ │             │ - ホバー型表示        │      │
│  │ │ Rust Backend │ │             │ - リネーム            │      │
│  │ │ - COM/PS     │ │             │ - 診断               │      │
│  │ │ - Lock file  │ │             └──────────┬───────────┘      │
│  │ │ - File sync  │ │                        │                  │
│  │ └──────────────┘ │                        │ reads            │
│  │                  │                        │                  │
│  │ ┌──────────────┐ │     reads              │                  │
│  │ │ WebView      │─┼──────────┐             │                  │
│  │ │ - Monaco     │ │          ▼             ▼                  │
│  │ │ - Vite+React │ │   %APPDATA%/verde/projects/               │
│  │ │ - i18next    │ │   └── <project-id>/                       │
│  │ │ - Theme      │ │       ├── .verde-meta.json                │
│  │ └──────────────┘ │       ├── .workbook-context.json          │
│  │                  │       ├── Sheet1.cls                      │
│  │ ┌──────────────┐ │       ├── ThisWorkbook.cls                │
│  │ │ MCP Server   │ │       └── MdlUtils.bas                   │
│  │ │ (Node.js)    │ │                                           │
│  │ └──────┬───────┘ │                                           │
│  └────────┼─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│    AI clients (Claude Desktop, Cursor, Claude Code, etc.)        │
│                                                                  │
│  ┌──────────────┐                                                │
│  │ Excel (.xlsm)│                                                │
│  └──────────────┘                                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. 技術スタック

### デスクトップアプリ (verde)

| レイヤー | 技術 | 備考 |
|---------|------|------|
| アプリフレームワーク | Tauri v2 | Rust backend + OS WebView |
| フロントエンド | Vite + React + TypeScript | バンドル最適化のため Vite |
| エディタ | Monaco Editor | `@monaco-editor/react` |
| i18n | i18next + react-i18next | JSON ロケールファイル |
| テーマ | CSS Variables + Monaco themes | OS追従 + 手動切替 |
| COM連携 | PowerShell 経由（MVP） | 将来的に windows-rs 移行 |
| MCP サーバー | Node.js + @modelcontextprotocol/sdk | アプリ同梱、CLI起動 |

### VBA LSP (verde-lsp)

| 用途 | クレート |
|------|---------|
| LSP プロトコル | tower-lsp |
| 字句解析 | logos |
| AST ノード管理 | la-arena |
| 文字列インターン | smol_str |
| JSON パース | serde, serde_json |
| 並行マップ | dashmap |

---

## 5. 対象ファイル形式

| 形式 | 拡張子 | MVP | 備考 |
|------|--------|-----|------|
| Excel マクロ有効ブック | .xlsm | ✅ | 主要ターゲット |
| Excel バイナリブック | .xlsb | 後日 | COM依存（ZIP展開不可） |
| Excel アドイン | .xla / .xlam | 後日 | |
| Excel 97-2003 | .xls | 後日 | レガシー |

---

## 6. CLI & 起動方法

```bash
# GUIウィンドウを開く
verde
verde "C:\work\sales.xlsm"

# MCP サーバーを起動（AI クライアント用）
verde serve --project "C:\work\sales.xlsm"
```

### 右クリックメニュー統合

インストーラー（Tauri の NSIS バンドラー）が以下のレジストリを登録:
- `HKCR\.xlsm\shell\Verde\command` → `"<apppath>" "%1"`
- `HKCR\Excel.SheetMacroEnabled.12\shell\Verde\command` → 同上

右クリックメニューの表示名: **Open with Verde**

---

## 7. ウィンドウ管理

**1 xlsm = 1 プロセス**

- 別の xlsm を開く → 新しい Tauri プロセスが起動
- 各プロセスは独立して動作（ロック、同期、LSP すべて独立）
- Tauri は Electron と比べてプロセスあたりのメモリが小さいため、複数起動時の負荷が軽い
- リソース消費増はユーザー側の判断に委ねる

---

## 8. ソースコード管理

### 配置場所

ユーザーの作業フォルダを汚さないため、**AppData 配下**に集約する。
ユーザーが .gitignore を追加する必要がない。

```
%APPDATA%/verde/projects/
└── <project-id>/
    ├── .verde-meta.json
    ├── .workbook-context.json
    ├── Sheet1.cls
    ├── ThisWorkbook.cls
    ├── MdlUtils.bas
    └── ...
```

### project-id の生成

xlsm の絶対パスから決定論的に生成する（SHA256 の先頭16文字）。
同一ファイルなら常に同じディレクトリにマッピングされる。

### .verde-meta.json

```json
{
  "xlsmPath": "C:\\work\\sales.xlsm",
  "projectId": "a1b2c3d4e5f67890",
  "exportedAt": "2026-04-19T10:30:00Z",
  "modules": {
    "Sheet1": {
      "filename": "Sheet1.cls",
      "type": 100,
      "lineCount": 52,
      "hash": "abc123..."
    }
  }
}
```

### .workbook-context.json

```json
{
  "workbookPath": "C:\\work\\sales.xlsm",
  "sheets": [
    {
      "name": "売上管理",
      "codeName": "Sheet1",
      "index": 1,
      "tables": [
        {
          "name": "tbl売上",
          "range": "A1:F500",
          "columns": ["日付", "商品", "数量", "単価", "金額", "備考"]
        }
      ],
      "namedRanges": [
        { "name": "入力エリア", "range": "B2:E100" }
      ]
    }
  ],
  "workbookNamedRanges": [
    { "name": "税率", "value": "0.1", "refersTo": "=マスタ!$A$1" }
  ],
  "references": [
    { "name": "Microsoft Scripting Runtime", "guid": "{420B2830-...}" }
  ],
  "lastUpdated": "2026-04-19T10:30:00Z"
}
```

---

## 9. Excel 同期フロー

### 開く時（Export）

1. 右クリック or CLI で xlsm パスを受け取る
2. ロックファイルをチェック・取得
3. PowerShell + COM 経由で VBA コードをエクスポート → AppData 配下に配置
4. 同時に workbook-context.json も生成
5. verde-lsp プロセスを stdio で起動、プロジェクトディレクトリを渡す
6. Monaco で開く

### 保存時（Auto Import）

1. ユーザーが Ctrl+S でファイル保存
2. .bas/.cls ファイルが AppData に書き込まれる
3. **自動的に** PowerShell + COM 経由で Excel にインポート
4. Excel がそのブックを開いている場合 → ダイアログ「Excel を閉じてから保存してください」
5. 成功 → meta のハッシュを更新

### 閉じる時

1. ロックファイルを削除
2. verde-lsp プロセスを終了
3. Tauri プロセス終了

### 競合検知

次回オープン時に:
- Excel 側のコードハッシュ vs meta のハッシュ vs ファイルのハッシュを三者比較
- 不一致があれば差分表示 → ユーザーが選択

---

## 10. ロックファイル

### 仕様

- 場所: xlsm と同じディレクトリに `~$<filename>.xlsm`
- Windows の隠し + システム属性を付与（Excel と同じ挙動）

### 内容

```json
{
  "user": "tanaka",
  "machine": "DESKTOP-ABC123",
  "pid": 12345,
  "app": "Verde",
  "lockedAt": "2026-04-19T10:30:00Z"
}
```

### ネットワークドライブ対応

共有フォルダ上の xlsm も想定する。

| ケース | 判定方法 |
|--------|---------|
| 同一マシン + PID 生存 | ロック中 |
| 同一マシン + PID 死亡 | ゴミロック → 自動削除 |
| 異なるマシン | 無条件でロック中と判定（PID 確認不可） |

ダイアログで「読み取り専用 / 強制解除 / キャンセル」を提示。

---

## 11. VBA LSP（Rust）

### リポジトリ

`verde-vba/verde-lsp` として独立。crates.io にも `verde-lsp` で公開。

### 通信方式

stdio（Verde からも VS Code からも接続可能）

### MVP スコープ

| 機能 | MVP | 備考 |
|------|-----|------|
| 定義ジャンプ | ✅ | プロシージャ、変数、型 |
| 補完 | ✅ | キーワード、シンボル、シート名、テーブル列名 |
| ホバー型表示 | ✅ | 変数の型、プロシージャのシグネチャ |
| 診断（警告） | ✅ | 未定義変数（Option Explicit 時）、型不一致等 |
| リネーム | ✅ | シンボル名の一括変更 |
| フォーマッター | ❌ | スコープ外 |
| 参照検索 | ❌ | 後日 |
| シグネチャヘルプ | ❌ | 後日 |

### Option Explicit の扱い

- `Option Explicit` あり → 未宣言変数を warning
- `Option Explicit` なし → 未宣言変数を暗黙の Variant としてシンボル登録（warning なし）
- モジュール単位で判定

### Excel Object Model

- **最終目標**: Range, Worksheet, Workbook, Application 等の全プロパティ・メソッドに対応
- **MVP**: 主要オブジェクトのみ（Range, Worksheet, Workbook, Application, Cells）
- 型定義は JSON で管理、クレート内にバンドル
- `.workbook-context.json` を読み、シート名・テーブル名・名前定義の補完に利用

### UserForm 対応

- フォームモジュール (.frm) を解析
- コントロール名からの補完（TextBox1.Value 等）
- MVP では基本的なコントロール型のみ（TextBox, ComboBox, ListBox, CommandButton, Label, Frame）

### 外部参照

- MVP ではスコープ外
- 後日、参照設定（references）の GUID から型定義を引く仕組みを追加

### 診断メッセージの言語

- MVP では英語固定
- 後日、i18n 対応を検討

### Rust クレート構成

```
verde-lsp/
├── Cargo.toml
├── src/
│   ├── main.rs
│   ├── server.rs
│   ├── parser/
│   │   ├── mod.rs
│   │   ├── lexer.rs
│   │   ├── ast.rs
│   │   └── parser.rs
│   ├── analysis/
│   │   ├── mod.rs
│   │   ├── symbols.rs
│   │   ├── resolve.rs
│   │   └── diagnostics.rs
│   ├── completion.rs
│   ├── hover.rs
│   ├── definition.rs
│   ├── rename.rs
│   ├── excel_model/
│   │   ├── mod.rs
│   │   ├── types.rs
│   │   └── context.rs
│   └── vba_builtins.rs
├── excel-types/
│   ├── range.json
│   ├── worksheet.json
│   └── ...
└── tests/
```

### 配布

- Verde アプリにプリビルドバイナリとしてバンドル
- Windows x64 のみ（MVP）
- CI で `cargo build --release --target x86_64-pc-windows-msvc`

---

## 12. MCP サーバー（Node.js）

### 配置

verde リポジトリ内に含まれる（Tauri アプリと同梱）

### 起動方法

```bash
verde serve --project "C:\work\sales.xlsm"
```

Claude Desktop 等の設定:
```json
{
  "mcpServers": {
    "verde": {
      "command": "verde",
      "args": ["serve", "--project", "C:\\work\\sales.xlsm"]
    }
  }
}
```

### ツール一覧

| ツール | 説明 | コンテキストコスト |
|--------|------|-------------------|
| `get_project_outline` | 全モジュール構造マップ + シート情報 | ~200-500 tok |
| `get_module_outline` | 単一モジュールの構造 | ~50-100 tok |
| `get_procedure` | 1プロシージャのソース | 可変 |
| `get_lines` | 行範囲指定で取得 | 可変 |
| `get_symbols` ✅ | 全シンボル + 型情報 | ~200-500 tok |
| `get_workbook_context` | シート・テーブル・名前定義 | ~100-300 tok |
| `search_code` | パターン検索 | 可変 |
| `patch_procedure` | プロシージャ単位の書き換え | — |
| `patch_lines` | 行範囲の書き換え | — |
| `write_module` | モジュール全体の書き換え | — |
| `create_module` | 新規モジュール作成 | — |
| `delete_module` | モジュール削除 | — |

`get_project_outline` には `.workbook-context.json` のシート情報も含める。

---

## 13. テーマ対応

### 方針

- **ライトテーマ** と **ダークテーマ** の両方を提供
- デフォルトは OS の設定に追従（`prefers-color-scheme`）
- ユーザーが手動でも切替可能（設定で「Light / Dark / System」の3択）
- 設定は `%APPDATA%/verde/settings.json` に永続化

### 実装

| レイヤー | 方式 |
|---------|------|
| アプリ UI | CSS Variables で全色を定義。`:root` と `[data-theme="dark"]` で切替 |
| Monaco Editor | `vs`（ライト）と `vs-dark`（ダーク）テーマを連動して切替 |
| Tauri ウィンドウ | `tauri::window::Theme` でタイトルバー色を OS ネイティブに合わせる |

### CSS Variables 設計（抜粋）

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;
  --bg-tertiary: #e5e7eb;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --accent: #059669;           /* Verde green */
  --accent-hover: #047857;
  --border: #d1d5db;
  --success: #059669;
  --warning: #d97706;
  --error: #dc2626;
}

[data-theme="dark"] {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d30;
  --text-primary: #cccccc;
  --text-secondary: #858585;
  --accent: #34d399;           /* Verde green (dark mode) */
  --accent-hover: #6ee7b7;
  --border: #3e3e42;
  --success: #4ec9b0;
  --warning: #dcdcaa;
  --error: #f44747;
}
```

---

## 14. 多言語対応（i18n）

### 方針

- フロントエンド（UI）のみ i18n 対応
- verde-lsp の診断メッセージは MVP では英語固定
- 翻訳ファイルは JSON 形式でアプリにバンドル

### 対応言語ロードマップ

| フェーズ | 言語 | コード | 理由 |
|---------|------|--------|------|
| MVP | English | en | OSSの共通語、最大市場 |
| MVP | 日本語 | ja | VBA文化が特に深い。開発者が日本語話者 |
| Phase 2 | 한국어 | ko | Excel/VBA依存が日本と同レベルに強い |
| Phase 2 | 简体中文 | zh-CN | ユーザー数が多い |
| Phase 3 | Deutsch | de | 欧州最大のExcel市場 |
| Phase 3 | Português | pt-BR | 南米最大市場、M365成長中 |

### 実装

```
src/locales/
├── en.json
├── ja.json
└── ...
```

```json
// en.json
{
  "app": {
    "title": "Verde"
  },
  "menu": {
    "open": "Open .xlsm",
    "syncToExcel": "Sync to Excel",
    "syncFromExcel": "Sync from Excel",
    "settings": "Settings",
    "theme": "Theme",
    "language": "Language"
  },
  "status": {
    "ready": "Ready",
    "syncing": "Syncing to Excel...",
    "synced": "Synced",
    "readOnly": "Read-Only (locked by another user)",
    "saved": "Saved {{filename}}"
  },
  "lock": {
    "title": "File is locked",
    "message": "This file is being edited by {{user}} on {{machine}} since {{time}}.",
    "openReadOnly": "Open Read-Only",
    "forceOpen": "Force Open",
    "cancel": "Cancel"
  },
  "conflict": {
    "title": "Conflict detected",
    "message": "{{count}} module(s) have been modified in both Verde and Excel.",
    "keepFile": "Keep Verde version",
    "keepExcel": "Keep Excel version"
  },
  "trust": {
    "title": "Setup Required",
    "message": "Please enable 'Trust access to the VBA project object model' in Excel settings.",
    "howTo": "How to enable"
  },
  "editor": {
    "noProject": "No project open",
    "welcome": "AI-native VBA development environment",
    "openPrompt": "Open .xlsm file to get started",
    "rightClickTip": "Tip: Right-click any .xlsm file → Open with Verde"
  },
  "outline": {
    "title": "Outline"
  },
  "explorer": {
    "title": "Explorer",
    "noModules": "No modules"
  }
}
```

```json
// ja.json
{
  "app": {
    "title": "Verde"
  },
  "menu": {
    "open": ".xlsm を開く",
    "syncToExcel": "Excel に同期",
    "syncFromExcel": "Excel から同期",
    "settings": "設定",
    "theme": "テーマ",
    "language": "言語"
  },
  "status": {
    "ready": "準備完了",
    "syncing": "Excel に同期中...",
    "synced": "同期完了",
    "readOnly": "読み取り専用（他のユーザーがロック中）",
    "saved": "{{filename}} を保存しました"
  },
  "lock": {
    "title": "ファイルがロックされています",
    "message": "このファイルは {{machine}} の {{user}} が {{time}} から編集中です。",
    "openReadOnly": "読み取り専用で開く",
    "forceOpen": "強制的に開く",
    "cancel": "キャンセル"
  },
  "conflict": {
    "title": "競合が検出されました",
    "message": "{{count}} 個のモジュールが Verde と Excel の両方で変更されています。",
    "keepFile": "Verde 側を保持",
    "keepExcel": "Excel 側を保持"
  },
  "trust": {
    "title": "セットアップが必要です",
    "message": "Excel の設定で「VBA プロジェクト オブジェクト モデルへのアクセスを信頼する」を有効にしてください。",
    "howTo": "設定方法を見る"
  },
  "editor": {
    "noProject": "プロジェクト未開",
    "welcome": "AI ネイティブ VBA 開発環境",
    "openPrompt": ".xlsm ファイルを開いて始めましょう",
    "rightClickTip": "ヒント: .xlsm ファイルを右クリック → Verde で開く"
  },
  "outline": {
    "title": "アウトライン"
  },
  "explorer": {
    "title": "エクスプローラー",
    "noModules": "モジュールなし"
  }
}
```

### 言語検出の優先順位

1. ユーザーが設定で明示的に選択した言語
2. OS のシステムロケール（`navigator.language`）
3. フォールバック: `en`

---

## 15. 設定ファイル

```
%APPDATA%/verde/settings.json
```

```json
{
  "theme": "system",
  "language": "auto",
  "editor": {
    "fontSize": 14,
    "fontFamily": "'Cascadia Code', 'Consolas', monospace",
    "tabSize": 4,
    "wordWrap": "off",
    "minimap": true
  },
  "sync": {
    "autoSyncToExcel": true
  }
}
```

---

## 16. Tauri プロジェクト構成

```
verde/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── src/
│   │   ├── main.rs               # エントリポイント + CLI 引数処理
│   │   ├── commands.rs            # Tauri コマンド（IPC ハンドラ）
│   │   ├── vba_bridge.rs          # VBA Export/Import（PowerShell COM 呼び出し）
│   │   ├── lock.rs                # ロックファイル管理
│   │   ├── project.rs             # プロジェクトディレクトリ管理
│   │   ├── lsp_manager.rs         # verde-lsp プロセスの起動・終了管理
│   │   └── settings.rs            # 設定ファイル読み書き
│   ├── icons/
│   └── resources/
│       └── verde-lsp.exe          # バンドルされた LSP バイナリ
│
├── src/                            # フロントエンド（Vite + React + TypeScript）
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── Editor.tsx              # Monaco エディタラッパー
│   │   ├── Sidebar.tsx             # ファイルエクスプローラ + アウトライン
│   │   ├── TabBar.tsx
│   │   ├── StatusBar.tsx
│   │   ├── TitleBar.tsx
│   │   ├── ConflictDialog.tsx
│   │   ├── LockDialog.tsx
│   │   ├── TrustGuideDialog.tsx    # VBA信頼設定のガイダンス
│   │   └── SettingsPanel.tsx
│   ├── hooks/
│   │   ├── useTheme.ts
│   │   ├── useLocale.ts
│   │   └── useVerdeProject.ts
│   ├── locales/
│   │   ├── en.json
│   │   └── ja.json
│   ├── styles/
│   │   ├── theme-light.css
│   │   ├── theme-dark.css
│   │   └── global.css
│   └── lib/
│       ├── tauri-commands.ts       # Tauri invoke ラッパー
│       ├── monaco-vba.ts           # VBA 言語定義
│       └── types.ts
│
├── mcp/                            # MCP サーバー（Node.js）
│   ├── package.json
│   ├── server.js
│   └── ...
│
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## 17. アプリ内ブランディング

| 箇所 | 表記 |
|------|------|
| ウィンドウタイトル | `Verde` |
| ウェルカム画面 | `Verde — AI-native VBA development environment` |
| 右クリックメニュー | `Open with Verde` |
| ステータスバーアクセント色 | `#059669`（ライト） / `#34d399`（ダーク） — 緑 |
| ロックファイル内 app フィールド | `"Verde"` |
| 競合ダイアログ | `"Keep Verde version"` / `"Verde 側を保持"` |

---

## 18. 前提条件（ユーザー側）

- Windows x64
- Excel がインストールされていること
- 「VBA プロジェクトオブジェクトモデルへのアクセスを信頼する」を手動でオン
  - 初回起動時に i18n 対応のガイダンスダイアログを表示（設定箇所の説明付き）

---

## 19. 開発環境

| コンポーネント | 開発環境 | 理由 |
|---------------|---------|------|
| verde-lsp (Rust) | WSL2 | OS 非依存の純粋テキスト処理 |
| verde Tauri backend (Rust) | Windows Native | COM, レジストリ, ロックファイル属性が Windows 固有 |
| verde frontend (React) | どちらでも可 | Web技術なのでOS非依存 |

### CI/CD

- GitHub Actions
- verde-lsp: Windows runner で `cargo build --release --target x86_64-pc-windows-msvc`
- verde: Windows runner で `cargo tauri build`
- リリースバイナリは GitHub Releases で配布

---

## 20. MVP ロードマップ

### Phase 1: エディタ基盤（Tauri）
- [ ] Tauri v2 + Vite + React プロジェクトセットアップ
- [ ] Monaco Editor 統合 + VBA シンタックスハイライト
- [ ] VBA Bridge（PowerShell COM 経由 Export/Import）
- [ ] AppData 配下のプロジェクト管理
- [ ] 保存時自動 Sync to Excel
- [ ] ロックファイル（ネットワークドライブ対応）
- [ ] 1 xlsm = 1 プロセス
- [ ] 右クリックメニュー統合
- [ ] ライト / ダーク テーマ（OS追従 + 手動切替）
- [ ] i18n（en, ja）
- [ ] VBA 信頼設定ガイダンスダイアログ
- [ ] 競合検知 + 解決ダイアログ
- [ ] 設定ファイル永続化

### Phase 2: LSP（Rust）
- [ ] VBA レキサー / パーサー
- [ ] シンボルテーブル構築
- [ ] 定義ジャンプ
- [ ] 補完（キーワード + シンボル + シート名）
- [ ] ホバー型表示
- [ ] 診断（Option Explicit 対応）
- [ ] リネーム
- [ ] Excel Object Model 型定義（主要オブジェクト）
- [ ] workbook-context.json 読み込み
- [ ] UserForm 基本対応

### Phase 3: AI 統合
- [ ] MCP サーバー（構造マップ + 細粒度ツール）
- [ ] `verde serve` CLI サブコマンド
- [ ] get_workbook_context ツール

### Phase 4: 拡張
- [ ] i18n 追加言語（ko, zh-CN）
- [ ] Excel Object Model 完全版
- [ ] 外部参照の型情報
- [ ] xlsb / xlam 対応
- [ ] VS Code 拡張（vscode-verde）
- [ ] i18n 追加言語（de, pt-BR）
- [ ] ARM64 対応

---

## 実装進捗ノート

### get_symbols ツール実装完了 (2026-04-19)

- PLANS.md §12 の `get_symbols` ツールを実装し、MCP プロトコル (`ListTools` / `CallTool`) に登録。
- 原義 TDD (Kent Beck) で駆動: Red → Green → Refactor を 4 サイクル（Sub → Function + Property → 複数モジュール + VB_Name → Variable + Const + Type）。
- 最終 11 テスト green、コミット 19 本（refactor 5 / test 8 / feat 6）。
- 返り値スキーマ: `{ name, kind, module, type? }`。`kind` は `Sub` / `Function` / `Property Get|Let|Set` / `Variable` / `Constant` / `Type` の 7 種。

### 実装上の気付き

- **スコープ判定**: プロシージャ内のローカル `Dim` とモジュールレベル宣言を分離するため、`Sub` / `Function` / `Property` の入れ子深度を line-by-line で追跡する方式を採用。AST なしでも実用十分。
- **`.cls` / `.frm` のモジュール名**: ファイル名（basename）ではなく `Attribute VB_Name = "..."` を正とする。VBA エクスポート時のファイル名は artifact であり、ランタイムの識別子とは別物。
- **`Const` vs `Variable` パターン順序**: `Public Const X` は `Public` で始まるため `VAR_LINE` にも引っかかってしまう。先に `CONST_LINE` を試す評価順が重要。
- **Type ブロック内フィールド**: `Id As Long` がモジュールレベル Variable として誤検出されないよう `inTypeBlock` フラグで抑制。
- **MCP プロトコル登録の分離**: ハンドラ実装と `ListTools` への登録は別コミット。構造（export）→ 挙動（dispatch）の順で配線することで、テストは純粋関数として叩ける状態を維持した。
- **Phase 1 監査で判明した未完了項目** (別途対応が必要):
  - 右クリックメニュー統合 (§6): 実装なし。
  - `TrustGuideDialog` / `ConflictDialog` / `LockDialog`: i18n 文字列のみ存在、コンポーネント未作成。
  - `src-tauri/src/lock.rs` の Windows 隠し+システム属性: TODO のまま。
  - 保存時の自動 Excel インポート: `project.rs` 内 TODO。
  - `src-tauri` 側に dead-code 警告 5 件（`LockInfo`, `VbaBridge` 系）。
  - `Justfile` が `cd mcp && npm install` を使う一方、ルートは Bun (`bun.lock`) を使用 — ランタイム不整合。

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| v1.0 | 2026-04-19 | 初版（Electron ベース） |
| v2.0 | 2026-04-19 | Electron → Tauri v2 移行、テーマ対応、i18n 対応、フロントエンド React 化 |
| v2.1 | 2026-04-19 | プロジェクト名「Verde」確定。全箇所にブランド名反映。アクセント色を緑に統一。Organization名 `verde-vba` 確定 |
