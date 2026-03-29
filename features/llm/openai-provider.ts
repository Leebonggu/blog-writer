import OpenAI from "openai";
import type { LLMProvider } from "./types";

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateText(prompt: string, systemPrompt?: string, images?: string[]): Promise<string> {
    const userContent: OpenAI.ChatCompletionContentPart[] = [];

    if (images && images.length > 0) {
      for (const img of images) {
        userContent.push({
          type: "image_url",
          image_url: { url: img, detail: "low" },
        });
      }
    }

    userContent.push({ type: "text", text: prompt });

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userContent });

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      messages,
    });

    return response.choices[0]?.message?.content ?? "";
  }
}
