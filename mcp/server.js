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

function getProjectDir(xlsmPath) {
  const hash = createHash("sha256").update(xlsmPath).digest("hex").slice(0, 16);
  const appData =
    process.env.APPDATA || join(process.env.HOME || "", ".config");
  return join(appData, "verde", "projects", hash);
}

function readMetaJson(projectDir) {
  const metaPath = join(projectDir, ".verde-meta.json");
  if (!existsSync(metaPath)) return null;
  return JSON.parse(readFileSync(metaPath, "utf-8"));
}

function readWorkbookContext(projectDir) {
  const ctxPath = join(projectDir, ".workbook-context.json");
  if (!existsSync(ctxPath)) return null;
  return JSON.parse(readFileSync(ctxPath, "utf-8"));
}

function listModuleFiles(projectDir) {
  if (!existsSync(projectDir)) return [];
  return readdirSync(projectDir).filter((f) =>
    [".bas", ".cls", ".frm"].includes(extname(f).toLowerCase())
  );
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
    case "get_project_outline": {
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

    case "get_module_outline": {
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

    case "get_procedure": {
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

    case "get_lines": {
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

    case "get_workbook_context": {
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

    case "search_code": {
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

    case "patch_procedure": {
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

    case "patch_lines": {
      const filePath = join(projectDir, args.module);
      if (!existsSync(filePath))
        return { content: [{ type: "text", text: "Module not found" }] };
      const lines = readFileSync(filePath, "utf-8").split("\n");
      lines.splice(args.start - 1, args.end - args.start + 1, ...args.newContent.split("\n"));
      writeFileSync(filePath, lines.join("\n"), "utf-8");
      return { content: [{ type: "text", text: "Lines patched" }] };
    }

    case "write_module": {
      writeFileSync(join(projectDir, args.module), args.content, "utf-8");
      return { content: [{ type: "text", text: "Module written" }] };
    }

    case "create_module": {
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

    case "delete_module": {
      const filePath = join(projectDir, args.module);
      if (!existsSync(filePath))
        return { content: [{ type: "text", text: "Module not found" }] };
      unlinkSync(filePath);
      return { content: [{ type: "text", text: "Module deleted" }] };
    }

    default:
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
