#!/usr/bin/env node

// Thin CLI wrapper so this MCP server can be installed globally and executed as `mcp-image-reader`.
// The server itself speaks MCP over stdio.

const args = process.argv.slice(2);

if (args.includes("-h") || args.includes("--help")) {
  process.stdout.write(`mcp-image-reader\n\nRuns the MCP Image Reader server over stdio.\n\nEnvironment variables:\n  OPENAI_API_KEY   (required)\n  OPENAI_BASE_URL  (optional)\n  OPENAI_MODEL     (optional)\n\nUsage:\n  mcp-image-reader\n`);
  process.exit(0);
}

if (args.includes("-v") || args.includes("--version")) {
  // Avoid importing package.json in ESM + TS compilation; keep it simple.
  process.stdout.write("0.1.0\n");
  process.exit(0);
}

// Start the server.
await import("./index.js");
