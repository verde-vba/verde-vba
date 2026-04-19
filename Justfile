# Verde — task runner

# Install all dependencies
setup:
    bun install
    cd mcp && npm install

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

# Start MCP server (for AI clients)
serve project:
    VERDE_PROJECT="{{project}}" node mcp/server.js

# Clean build artifacts
clean:
    rm -rf dist
    cd src-tauri && cargo clean
