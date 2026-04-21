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

# Clean build artifacts
clean:
    rm -rf dist
    cd src-tauri && cargo clean
