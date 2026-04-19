#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join, basename, extname } from "path";
import { createHash } from "crypto";

const server = new Server(
  { name: "verde", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

export function getProjectDir(xlsmPath) {
  const hash = createHash("sha256").update(xlsmPath).digest("hex").slice(0, 16);
  const appData =
    process.env.APPDATA || join(process.env.HOME || "", ".config");
  return join(appData, "verde", "projects", hash);
}

export function readMetaJson(projectDir) {
  const metaPath = join(projectDir, ".verde-meta.json");
  if (!existsSync(metaPath)) return null;
  return JSON.parse(readFileSync(metaPath, "utf-8"));
}

export function readWorkbookContext(projectDir) {
  const ctxPath = join(projectDir, ".workbook-context.json");
  if (!existsSync(ctxPath)) return null;
  return JSON.parse(readFileSync(ctxPath, "utf-8"));
}

export function listModuleFiles(projectDir) {
  if (!existsSync(projectDir)) return [];
  return readdirSync(projectDir).filter((f) =>
    [".bas", ".cls", ".frm"].includes(extname(f).toLowerCase())
  );
}

export function handleGetProjectOutline(projectDir, _args) {
  const meta = readMetaJson(projectDir);
  const ctx = readWorkbookContext(projectDir);
  const files = listModuleFiles(projectDir);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ meta, workbookContext: ctx, files }, null, 2),
      },
    ],
  };
}

export function handleGetModuleOutline(projectDir, args) {
  const filePath = join(projectDir, args.module);
  if (!existsSync(filePath))
    return { content: [{ type: "text", text: "Module not found" }] };
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const procedures = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(
      /^\s*(Public|Private|Friend)?\s*(Sub|Function|Property\s+(Get|Let|Set))\s+(\w+)/i
    );
    if (match) {
      procedures.push({ name: match[4], type: match[2], line: i + 1 });
    }
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          { module: args.module, lineCount: lines.length, procedures },
          null,
          2
        ),
      },
    ],
  };
}

export function handleGetProcedure(projectDir, args) {
  const filePath = join(projectDir, args.module);
  if (!existsSync(filePath))
    return { content: [{ type: "text", text: "Module not found" }] };
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  let startLine = -1;
  let endLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(
      new RegExp(
        `^\\s*(Public|Private|Friend)?\\s*(Sub|Function|Property\\s+(Get|Let|Set))\\s+${args.procedure}\\b`,
        "i"
      )
    );
    if (match) {
      startLine = i;
    }
    if (startLine >= 0 && /^\s*End\s+(Sub|Function|Property)/i.test(lines[i])) {
      endLine = i;
      break;
    }
  }
  if (startLine < 0)
    return { content: [{ type: "text", text: "Procedure not found" }] };
  return {
    content: [
      {
        type: "text",
        text: lines.slice(startLine, endLine + 1).join("\n"),
      },
    ],
  };
}

export function handleGetLines(projectDir, args) {
  const filePath = join(projectDir, args.module);
  if (!existsSync(filePath))
    return { content: [{ type: "text", text: "Module not found" }] };
  const lines = readFileSync(filePath, "utf-8").split("\n");
  return {
    content: [
      {
        type: "text",
        text: lines.slice(args.start - 1, args.end).join("\n"),
      },
    ],
  };
}

export function handleGetWorkbookContext(projectDir, _args) {
  const ctx = readWorkbookContext(projectDir);
  return {
    content: [
      {
        type: "text",
        text: ctx ? JSON.stringify(ctx, null, 2) : "No workbook context available",
      },
    ],
  };
}

export function handleSearchCode(projectDir, args) {
  const files = listModuleFiles(projectDir);
  const results = [];
  const regex = new RegExp(args.pattern, "gi");
  for (const file of files) {
    const content = readFileSync(join(projectDir, file), "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        results.push({ file, line: i + 1, text: lines[i].trim() });
      }
      regex.lastIndex = 0;
    }
  }
  return {
    content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
  };
}

// Each entry: [regex, (match) => ({ name, kind })]
// Regex must be /g and capture the identifier in group 1 (and for Property,
// the variant Get|Let|Set in an earlier group).
const SYMBOL_PATTERNS = [
  [/\bSub\s+(\w+)\s*\(/g, (m) => ({ name: m[1], kind: "Sub" })],
  [/\bFunction\s+(\w+)\s*\(/g, (m) => ({ name: m[1], kind: "Function" })],
  [
    /\bProperty\s+(Get|Let|Set)\s+(\w+)\s*\(/g,
    (m) => ({ name: m[2], kind: `Property ${m[1]}` }),
  ],
];

// VBA exports embed the authoritative module name in an Attribute line.
// Prefer it over the filename basename, which is just an export artifact.
const VB_NAME_ATTR = /^\s*Attribute\s+VB_Name\s*=\s*"([^"]+)"/m;

function moduleNameFor(file, source) {
  const match = source.match(VB_NAME_ATTR);
  if (match) return match[1];
  return basename(file, extname(file));
}

export function handleGetSymbols(projectDir, _args) {
  const files = listModuleFiles(projectDir);
  const symbols = [];
  for (const file of files) {
    const content = readFileSync(join(projectDir, file), "utf-8");
    const module = moduleNameFor(file, content);
    for (const [regex, toSymbol] of SYMBOL_PATTERNS) {
      regex.lastIndex = 0;
      let m;
      while ((m = regex.exec(content)) !== null) {
        symbols.push({ ...toSymbol(m), module });
      }
    }
  }
  return {
    content: [{ type: "text", text: JSON.stringify(symbols, null, 2) }],
  };
}

export function handlePatchProcedure(projectDir, args) {
  const filePath = join(projectDir, args.module);
  if (!existsSync(filePath))
    return { content: [{ type: "text", text: "Module not found" }] };
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  let startLine = -1;
  let endLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(
      new RegExp(
        `^\\s*(Public|Private|Friend)?\\s*(Sub|Function|Property\\s+(Get|Let|Set))\\s+${args.procedure}\\b`,
        "i"
      )
    );
    if (match) startLine = i;
    if (startLine >= 0 && /^\s*End\s+(Sub|Function|Property)/i.test(lines[i])) {
      endLine = i;
      break;
    }
  }
  if (startLine < 0)
    return { content: [{ type: "text", text: "Procedure not found" }] };
  lines.splice(startLine, endLine - startLine + 1, ...args.newSource.split("\n"));
  writeFileSync(filePath, lines.join("\n"), "utf-8");
  return { content: [{ type: "text", text: "Procedure patched" }] };
}

export function handlePatchLines(projectDir, args) {
  const filePath = join(projectDir, args.module);
  if (!existsSync(filePath))
    return { content: [{ type: "text", text: "Module not found" }] };
  const lines = readFileSync(filePath, "utf-8").split("\n");
  lines.splice(args.start - 1, args.end - args.start + 1, ...args.newContent.split("\n"));
  writeFileSync(filePath, lines.join("\n"), "utf-8");
  return { content: [{ type: "text", text: "Lines patched" }] };
}

export function handleWriteModule(projectDir, args) {
  writeFileSync(join(projectDir, args.module), args.content, "utf-8");
  return { content: [{ type: "text", text: "Module written" }] };
}

export function handleCreateModule(projectDir, args) {
  const filename = `${args.name}.${args.type}`;
  const filePath = join(projectDir, filename);
  if (existsSync(filePath))
    return { content: [{ type: "text", text: "Module already exists" }] };
  const header =
    args.type === "cls"
      ? `VERSION 1.0 CLASS\nBEGIN\n  MultiUse = -1\nEND\nAttribute VB_Name = "${args.name}"\n`
      : `Attribute VB_Name = "${args.name}"\n`;
  writeFileSync(filePath, header + (args.content || ""), "utf-8");
  return {
    content: [{ type: "text", text: `Module ${filename} created` }],
  };
}

export function handleDeleteModule(projectDir, args) {
  const filePath = join(projectDir, args.module);
  if (!existsSync(filePath))
    return { content: [{ type: "text", text: "Module not found" }] };
  unlinkSync(filePath);
  return { content: [{ type: "text", text: "Module deleted" }] };
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_project_outline",
      description:
        "Get full module structure map and sheet info for the project",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "get_module_outline",
      description: "Get the outline of a single module",
      inputSchema: {
        type: "object",
        properties: { module: { type: "string" } },
        required: ["module"],
      },
    },
    {
      name: "get_procedure",
      description: "Get the source of a single procedure",
      inputSchema: {
        type: "object",
        properties: {
          module: { type: "string" },
          procedure: { type: "string" },
        },
        required: ["module", "procedure"],
      },
    },
    {
      name: "get_lines",
      description: "Get lines from a module by range",
      inputSchema: {
        type: "object",
        properties: {
          module: { type: "string" },
          start: { type: "number" },
          end: { type: "number" },
        },
        required: ["module", "start", "end"],
      },
    },
    {
      name: "get_workbook_context",
      description: "Get sheet names, tables, and named ranges",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "search_code",
      description: "Search code across all modules using a pattern",
      inputSchema: {
        type: "object",
        properties: { pattern: { type: "string" } },
        required: ["pattern"],
      },
    },
    {
      name: "patch_procedure",
      description: "Replace a procedure's source code",
      inputSchema: {
        type: "object",
        properties: {
          module: { type: "string" },
          procedure: { type: "string" },
          newSource: { type: "string" },
        },
        required: ["module", "procedure", "newSource"],
      },
    },
    {
      name: "patch_lines",
      description: "Replace a range of lines in a module",
      inputSchema: {
        type: "object",
        properties: {
          module: { type: "string" },
          start: { type: "number" },
          end: { type: "number" },
          newContent: { type: "string" },
        },
        required: ["module", "start", "end", "newContent"],
      },
    },
    {
      name: "write_module",
      description: "Overwrite an entire module",
      inputSchema: {
        type: "object",
        properties: {
          module: { type: "string" },
          content: { type: "string" },
        },
        required: ["module", "content"],
      },
    },
    {
      name: "create_module",
      description: "Create a new VBA module",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string", enum: ["bas", "cls"] },
          content: { type: "string" },
        },
        required: ["name", "type"],
      },
    },
    {
      name: "delete_module",
      description: "Delete a VBA module",
      inputSchema: {
        type: "object",
        properties: { module: { type: "string" } },
        required: ["module"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const projectDir = getProjectDir(process.env.VERDE_PROJECT || "");

  switch (name) {
    case "get_project_outline":
      return handleGetProjectOutline(projectDir, args);
    case "get_module_outline":
      return handleGetModuleOutline(projectDir, args);
    case "get_procedure":
      return handleGetProcedure(projectDir, args);
    case "get_lines":
      return handleGetLines(projectDir, args);
    case "get_workbook_context":
      return handleGetWorkbookContext(projectDir, args);
    case "search_code":
      return handleSearchCode(projectDir, args);
    case "patch_procedure":
      return handlePatchProcedure(projectDir, args);
    case "patch_lines":
      return handlePatchLines(projectDir, args);
    case "write_module":
      return handleWriteModule(projectDir, args);
    case "create_module":
      return handleCreateModule(projectDir, args);
    case "delete_module":
      return handleDeleteModule(projectDir, args);
    default:
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}
