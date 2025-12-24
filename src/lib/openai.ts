import OpenAI from "openai";

export type VisionDetail = "low" | "high";

export async function describeImageWithOpenAICompatible(opts: {
  /**
   * A URL understood by the OpenAI-compatible API.
   * Can be a remote http(s) URL or a data URL (data:<mime>;base64,...).
   */
  imageUrl: string;
  prompt?: string;
  detail?: VisionDetail;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Put it in your environment or a .env file."
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  const prompt = opts.prompt?.trim() || "Describe this image.";

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: opts.imageUrl,
              ...(opts.detail ? { detail: opts.detail } : {}),
            },
          },
        ],
      },
    ],
    // Keep responses bounded; user can change provider-side defaults if needed.
    max_tokens: 700,
  });

  const text = completion.choices?.[0]?.message?.content;
  if (!text) {
    return "(No text returned by model.)";
  }
  return text;
}
