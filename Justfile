# Verde — task runner

# Install all dependencies
setup:
    bun install
    cd mcp && bun install

# Start Tauri dev server
dev:
    cargo tauri dev

# Build Tauri app for production
build:
    cargo tauri build

# Run all checks (TypeScript + Rust)
check:
    bun run tsc --noEmit
    cd src-tauri && cargo check

# Check Rust only
check-rust:
    cd src-tauri && cargo check

# Check TypeScript only
check-ts:
    bun run tsc --noEmit

# Format Rust code
fmt:
    cd src-tauri && cargo fmt

# Lint Rust code
clippy:
    cd src-tauri && cargo clippy -- -D warnings

# Start MCP server (for AI clients) — routes through the `verde` CLI
# so Claude Desktop can invoke the same entry point in production.
serve project:
    cd src-tauri && cargo run --quiet --bin verde -- serve --project "{{project}}"

# Fetch tree-sitter-vba.wasm from GitHub Releases (release-cycle independent).
# No silent fallback to a local emsdk build — Sprint 30 D5 / Sprint 31 decision.
# Override TS_VBA_VERSION to pin to a different tag.
TS_VBA_VERSION := "v0.1.0"
TS_VBA_REPO := "verde-vba/treesitter-vba"

fetch-wasm:
    mkdir -p public
    curl -fsSL \
      -o public/tree-sitter-vba.wasm \
      "https://github.com/{{TS_VBA_REPO}}/releases/download/{{TS_VBA_VERSION}}/tree-sitter-vba.wasm"
    @echo "Fetched tree-sitter-vba.wasm ({{TS_VBA_VERSION}}) -> public/"

# Fetch verde-lsp sidecar binary from GitHub Releases (release-cycle
# independent — Sprint 30 D5 / Sprint 32.E decision). Downloaded asset
# is renamed to the Tauri sidecar convention
# `src-tauri/binaries/verde-lsp-<target-triple>[.exe]`, which Tauri's
# bundler resolves against the host triple at build time.
#
# Supported host triples (verde-lsp v0.1.0 release matrix):
#   linux   x86_64-unknown-linux-gnu  -> verde-lsp-linux
#   macOS   aarch64-apple-darwin      -> verde-lsp-macos
#   windows x86_64-pc-windows-msvc    -> verde-lsp-windows.exe
# macOS x86_64 is intentionally skipped (Sprint 32.E decision: not in
# initial release matrix; Apple Silicon only).
#
# Override VERDE_LSP_VERSION to pin to a different tag.
VERDE_LSP_VERSION := "v0.1.0"
VERDE_LSP_REPO := "verde-vba/verde-lsp"

fetch-lsp:
    #!/usr/bin/env bash
    set -euo pipefail
    mkdir -p src-tauri/binaries
    host="$(uname -sm)"
    case "$host" in
      "Linux x86_64")   asset="verde-lsp-linux";       triple="x86_64-unknown-linux-gnu"; ext="" ;;
      "Darwin arm64")   asset="verde-lsp-macos";       triple="aarch64-apple-darwin";     ext="" ;;
      MINGW*\ x86_64|"MSYS_NT"*\ x86_64|"CYGWIN_NT"*\ x86_64)
                        asset="verde-lsp-windows.exe"; triple="x86_64-pc-windows-msvc";   ext=".exe" ;;
      *) echo "Unsupported host '$host'. verde-lsp {{VERDE_LSP_VERSION}} ships linux/macos-arm/windows only." >&2; exit 1 ;;
    esac
    dest="src-tauri/binaries/verde-lsp-${triple}${ext}"
    curl -fsSL -o "$dest" "https://github.com/{{VERDE_LSP_REPO}}/releases/download/{{VERDE_LSP_VERSION}}/$asset"
    chmod +x "$dest"
    echo "Fetched $asset ({{VERDE_LSP_VERSION}}) -> $dest"

# Clean build artifacts
clean:
    rm -rf dist
    cd src-tauri && cargo clean
