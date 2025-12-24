import "dotenv/config";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { imagePathToDataUrl, normalizeBase64ToDataUrl } from "./lib/image.js";
import { describeImageWithOpenAICompatible } from "./lib/openai.js";

const server = new McpServer({
  name: "mcp-image-reader",
  version: "0.1.0",
});

const imageInputSchema = {
  imagePath: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Path to an image file on disk (png/jpg/webp/gif). Provide this OR imageBase64."
    ),
  imageBase64: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Image bytes as base64, or a full data URL like data:image/png;base64,.... Provide this OR imagePath."
    ),
  imageUrl: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Remote image URL (http/https). Provide this OR imagePath OR imageBase64."
    ),
  urlMode: z
    .enum(["direct", "download"])
    .optional()
    .describe(
      "If imageUrl is provided: 'direct' passes the URL to the model provider; 'download' fetches the image and converts it to a data URL. Default: direct."
    ),
  detail: z
    .enum(["low", "high"])
    .optional()
    .describe("Vision detail level (if supported by your provider/model)."),
};

async function downloadImageUrlToDataUrl(imageUrl: string): Promise<string> {
  const url = new URL(imageUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("imageUrl must be http(s).");
  }

  const res = await fetch(url, {
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Failed to download imageUrl (${res.status} ${res.statusText}).`);
  }

  const contentType = res.headers.get("content-type")?.split(";")?.[0]?.trim();
  const buf = Buffer.from(await res.arrayBuffer());
  // Safety: keep things bounded.
  const maxBytes = 12 * 1024 * 1024;
  if (buf.byteLength > maxBytes) {
    throw new Error(
      `Downloaded image is too large (${buf.byteLength} bytes). Limit is ${maxBytes} bytes.`
    );
  }

  const mime = contentType && contentType.startsWith("image/") ? contentType : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function resolveImageUrl(args: {
  imagePath?: string;
  imageBase64?: string;
  imageUrl?: string;
  urlMode?: "direct" | "download";
}): Promise<string> {
  const { imagePath, imageBase64, imageUrl, urlMode } = args;
  const provided = [imagePath, imageBase64, imageUrl].filter(Boolean).length;

  if (provided === 0) {
    throw new Error("Provide exactly one of 'imagePath', 'imageBase64', or 'imageUrl'.");
  }
  if (provided > 1) {
    throw new Error(
      "Provide only one of 'imagePath', 'imageBase64', or 'imageUrl', not multiple."
    );
  }

  if (imagePath) return await imagePathToDataUrl(imagePath);
  if (imageBase64) return normalizeBase64ToDataUrl(imageBase64);

  // imageUrl
  const mode = urlMode ?? "direct";
  if (mode === "direct") return imageUrl!;
  return await downloadImageUrlToDataUrl(imageUrl!);
}

server.tool(
  "help",
  "Show usage, environment variables, and tool guidance for this MCP server.",
  {},
  async () => {
    const text = [
      "mcp-image-reader (MCP server)",
      "",
      "Available tools:",
      "- describe_image: quick natural-language description / caption.",
      "- ocr_image: extract visible text from an image.",
      "- extract_receipt: extract common receipt fields as JSON (best-effort).",
      "- read_image: advanced/custom prompt for arbitrary image analysis.",
      "",
      "Image input:",
      "- Provide exactly one of imagePath OR imageBase64 OR imageUrl.",
      "- imageBase64 may be raw base64 or a full data URL.",
      "- imageUrl can be passed through directly (urlMode=direct) or downloaded then converted to a data URL (urlMode=download).",
      "",
      "Environment:",
      "- OPENAI_API_KEY (required)",
      "- OPENAI_BASE_URL (optional, for OpenAI-compatible providers)",
      "- OPENAI_MODEL (optional, default: gpt-4o-mini)",
    ].join("\n");

    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "read_image",
  "Read/understand an image using a custom prompt. Use this when you need a specific instruction beyond basic describe/OCR.",
  {
    ...imageInputSchema,
    prompt: z
      .string()
      .optional()
      .describe(
        "Instruction for what to extract (e.g. 'OCR the receipt', 'Describe the UI and list buttons'). If omitted, the model will describe the image."
      ),
  },
  async (args) => {
    const imageUrl = await resolveImageUrl(args);

    const text = await describeImageWithOpenAICompatible({
      imageUrl,
      prompt: args.prompt,
      detail: args.detail,
    });

    return {
      content: [{ type: "text", text }],
    };
  }
);

server.tool(
  "describe_image",
  "Generate a concise, agent-friendly description of an image (scene summary + notable objects + any visible text).",
  {
    ...imageInputSchema,
    style: z
      .enum(["concise", "detailed"])
      .optional()
      .describe("How verbose the description should be."),
  },
  async (args) => {
    const imageUrl = await resolveImageUrl(args);
    const style = args.style ?? "concise";

    const prompt =
      style === "detailed"
        ? "Describe the image in detail. Include: scene summary, main objects, attributes, and any visible text."
        : "Describe the image concisely. Include a short scene summary, key objects, and any visible text.";

    const text = await describeImageWithOpenAICompatible({
      imageUrl,
      prompt,
      detail: args.detail,
    });

    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "ocr_image",
  "Extract visible text from an image (OCR-like). Returns text in reading order; best-effort.",
  {
    ...imageInputSchema,
    format: z
      .enum(["text", "json"])
      .optional()
      .describe(
        "Output format. 'text' returns plain text. 'json' asks the model to return a JSON object with lines." 
      ),
  },
  async (args) => {
    const imageUrl = await resolveImageUrl(args);
    const format = args.format ?? "text";

    const prompt =
      format === "json"
        ? [
            "Extract ALL visible text from the image.",
            "Return STRICT JSON only (no markdown) with this shape:",
            '{"text":"...","lines":[{"line":"..."}],"notes":"..."}',
            "If there is no text, return an empty text string and empty lines array.",
          ].join("\n")
        : "Extract ALL visible text from the image. Return plain text only, in reading order.";

    const text = await describeImageWithOpenAICompatible({
      imageUrl,
      prompt,
      detail: args.detail,
    });

    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "extract_receipt",
  "Extract common receipt fields (merchant, date, total, currency, items) from an image. Best-effort; returns JSON.",
  {
    ...imageInputSchema,
    currencyHint: z
      .string()
      .optional()
      .describe("Optional hint like 'USD' or 'EUR' to help normalization."),
  },
  async (args) => {
    const imageUrl = await resolveImageUrl(args);

    const prompt = [
      "You are extracting structured data from a receipt image.",
      "Return STRICT JSON only (no markdown) with this shape:",
      "{",
      '  "merchant": string | null,',
      '  "date": string | null,',
      '  "total": number | null,',
      '  "currency": string | null,',
      '  "tax": number | null,',
      '  "subtotal": number | null,',
      '  "items": [{"name": string, "qty": number | null, "price": number | null}]',
      "}",
      "Use ISO date if possible (YYYY-MM-DD).",
      args.currencyHint ? `Currency hint: ${args.currencyHint}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const text = await describeImageWithOpenAICompatible({
      imageUrl,
      prompt,
      detail: args.detail,
    });

    return { content: [{ type: "text", text }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
