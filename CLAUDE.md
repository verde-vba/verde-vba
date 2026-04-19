# Verde — AI-native VBA Development Environment

## Project Overview

Tauri v2 desktop app (Rust backend + React frontend) with MCP server for AI integration.
Replaces VBE for editing VBA macros in .xlsm files.

## Tech Stack

- **Backend**: Rust (Tauri v2), PowerShell COM for Excel integration
- **Frontend**: Vite + React + TypeScript, Monaco Editor
- **MCP Server**: Node.js + @modelcontextprotocol/sdk
- **Dev Environment**: mise (cross-platform) or Nix flake

## Commands

```bash
mise install               # Install toolchain (Rust, Node.js, Bun, just)
just setup                 # Install all dependencies
just dev                   # Tauri dev server
just build                 # Build for production
just check                 # TypeScript + Rust checks
just fmt                   # Format Rust code
just clippy                # Lint Rust code
just serve "C:\file.xlsm"  # Start MCP server
```

## Architecture

- `src-tauri/src/commands.rs` — Tauri IPC command handlers
- `src-tauri/src/project.rs` — Project directory management (AppData)
- `src-tauri/src/lock.rs` — Lock file management
- `src-tauri/src/vba_bridge.rs` — PowerShell COM export/import
- `src-tauri/src/settings.rs` — User settings persistence
- `src/components/Editor.tsx` — Monaco Editor wrapper with VBA support
- `src/hooks/useTheme.ts` — Theme management (system/light/dark)
- `src/hooks/useLocale.ts` — i18n initialization (en, ja)
- `mcp/server.js` — MCP server with 11 tools for AI access

## Key Design Decisions

- 1 xlsm = 1 process (independent Tauri instances)
- VBA source stored in %APPDATA%/verde/projects/<sha256-hash>/
- Project ID: SHA256 of xlsm absolute path (first 16 chars)
- COM integration via PowerShell (MVP), future: windows-rs
- Lock files: ~$<filename>.xlsm in same directory as xlsm
