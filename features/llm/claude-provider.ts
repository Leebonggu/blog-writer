import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider } from "./types";

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateText(prompt: string, systemPrompt?: string, images?: string[]): Promise<string> {
    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    if (images && images.length > 0) {
      for (const img of images) {
        const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
        const mediaType = img.match(/^data:(image\/\w+);base64,/)?.[1] ?? "image/jpeg";
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: base64Data,
          },
        });
      }
    }

    content.push({ type: "text", text: prompt });

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt ?? "",
      messages: [{ role: "user", content }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock ? (textBlock as Anthropic.TextBlock).text : "";
  }
}
