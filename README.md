# mcp-image-reader

An **MCP server** that can **read/understand images** by calling an **OpenAI-compatible** API (OpenAI, or any provider that implements the same API shape).

## What you get

- MCP tool: `read_image`
  - Input: `imagePath` (local file path) **or** `imageBase64` (base64/data URL)
  - Output: model-generated text (description / OCR / whatever your prompt asks)

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

## Tool: read_image

Example arguments:

- From disk:
  - `imagePath`: `./examples/cat.png`
  - `prompt`: `"Describe what's in the image and list any text you see."`

- From base64:
  - `imageBase64`: `"iVBORw0KGgoAAA..."` (or a full `data:image/png;base64,...` URL)

## Notes

- Default model: `gpt-4o-mini` (override with `OPENAI_MODEL`)
- Default base URL: OpenAI SDK default (override with `OPENAI_BASE_URL`)

