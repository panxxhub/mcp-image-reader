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

server.tool(
  "read_image",
  {
    imagePath: z.string().min(1).optional().describe("Path to an image file on disk (png/jpg/webp/gif)."),
    imageBase64: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Image bytes as base64, or a full data URL like data:image/png;base64,...."
      ),
    prompt: z
      .string()
      .optional()
      .describe("Optional instruction for what to extract (e.g. 'OCR the receipt')."),
    detail: z
      .enum(["low", "high"])
      .optional()
      .describe("Vision detail level (if supported by your provider/model)."),
  },
  async ({ imagePath, imageBase64, prompt, detail }) => {
    if (!imagePath && !imageBase64) {
      throw new Error("Provide either 'imagePath' or 'imageBase64'.");
    }
    if (imagePath && imageBase64) {
      throw new Error("Provide only one of 'imagePath' or 'imageBase64', not both.");
    }

    const dataUrl = imagePath
      ? await imagePathToDataUrl(imagePath)
      : normalizeBase64ToDataUrl(imageBase64!);

    const text = await describeImageWithOpenAICompatible({
      dataUrl,
      prompt,
      detail,
    });

    return {
      content: [{ type: "text", text }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
