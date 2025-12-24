# mcp-image-reader

An **MCP server** that can **read/understand images** by calling an **OpenAI-compatible** API (OpenAI, or any provider that implements the same API shape).

## What you get

- MCP tools:
  - `help` — show usage + environment variables
  - `describe_image` — quick scene description (agent-friendly)
  - `ocr_image` — text extraction (plain text or JSON)
  - `extract_receipt` — best-effort receipt parsing into JSON
  - `read_image` — custom prompt for anything else

## Setup

1) Install deps

- `npm install`

2) Configure environment

- Copy `.env.example` to `.env` and fill `OPENAI_API_KEY`

3) Run the server

- Dev (no build): `npm run dev`
- Build + run: `npm run build` then `npm start`

## Using from VS Code (MCP)

This repo includes a ready config at `.vscode/mcp.json`.

If you prefer to run the built server, change it to use `node dist/index.js` (and run `npm run build` once).

## Install globally (use as an executable)

If you want to use it like other global npm CLIs (so you can run `mcp-image-reader` from anywhere):

### Option 1: global install from a local clone

- Run `npm install`
- Run `npm run build`
- Run `npm link`

After that, verify:

- `mcp-image-reader --help`

To remove the global link later:

- `npm unlink -g mcp-image-reader`

### Option 2: install globally from a folder path

- `npm i -g /absolute/path/to/mcp-image-reader`

This repo includes a `prepare` script, so it will build during install/link.

### Use the global executable from VS Code

In any project, create `.vscode/mcp.json` like:

```json
{
  "servers": {
    "mcp-image-reader": {
      "command": "mcp-image-reader",
      "args": [],
      "env": {
        "OPENAI_API_KEY": "${env:OPENAI_API_KEY}",
        "OPENAI_BASE_URL": "${env:OPENAI_BASE_URL}",
        "OPENAI_MODEL": "${env:OPENAI_MODEL}"
      }
    }
  }
}
```

## Tool: read_image

Example arguments:

- From disk:
  - `imagePath`: `./examples/cat.png`
  - `prompt`: `"Describe what's in the image and list any text you see."`

- From URL:
  - `imageUrl`: `"https://example.com/image.png"`
  - Optional: `urlMode`: `"direct"` (default) or `"download"`

- From base64:
  - `imageBase64`: `"iVBORw0KGgoAAA..."` (or a full `data:image/png;base64,...` URL)

## Notes

- Default model: `gpt-4o-mini` (override with `OPENAI_MODEL`)
- Default base URL: OpenAI SDK default (override with `OPENAI_BASE_URL`)

### Image URLs

If you pass `imageUrl`, by default the server sends it directly to the model provider. If your provider cannot fetch remote URLs, set `urlMode: "download"` to have the server download the image and convert it into a data URL first.

## Agent-friendliness

Tool descriptions and per-parameter documentation are exposed through MCP metadata.
In VS Code (and other MCP clients), you should see the tool list with descriptions.

