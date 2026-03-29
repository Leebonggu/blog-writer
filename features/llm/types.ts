export type LLMModel = "claude-sonnet" | "gpt-4o";

export interface LLMProvider {
  generateText(prompt: string, systemPrompt?: string, images?: string[]): Promise<string>;
}
