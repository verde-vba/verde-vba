# Verde

AI-native VBA development environment — a modern alternative to VBE (Visual Basic Editor).

## Features

- **Monaco Editor** with VBA syntax highlighting
- **AI integration** via MCP server (Claude Desktop, Cursor, Claude Code, etc.)
- **Excel sync** — export/import VBA code via PowerShell COM
- **Lock file** management for concurrent editing
- **Light/Dark theme** with OS detection
- **i18n** — English and Japanese

## Requirements

- Windows x64
- Excel with "Trust access to the VBA project object model" enabled

## Development

```bash
# Install toolchain (Rust, Node.js, Bun, just)
mise install

# Install dependencies
just setup

# Run dev server
just dev

# Build
just build

# Run all checks
just check

# See all available tasks
just --list
```

Alternatively, if you use Nix:

```bash
nix develop
```

## Architecture

```
verde-vba/
├── src/            # Frontend (Vite + React + TypeScript)
├── src-tauri/      # Tauri backend (Rust)
├── mcp/            # MCP server (Node.js)
└── flake.nix       # Nix dev environment
```

## License

MIT
