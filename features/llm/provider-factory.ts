import type { LLMModel, LLMProvider } from "./types";
import { ClaudeProvider } from "./claude-provider";
import { OpenAIProvider } from "./openai-provider";

interface ApiKeys {
  anthropicApiKey?: string;
  openaiApiKey?: string;
}

export function createProvider(model: LLMModel, keys: ApiKeys): LLMProvider {
  switch (model) {
    case "claude-sonnet":
      if (!keys.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY is required");
      return new ClaudeProvider(keys.anthropicApiKey);
    case "gpt-4o":
      if (!keys.openaiApiKey) throw new Error("OPENAI_API_KEY is required");
      return new OpenAIProvider(keys.openaiApiKey);
    default:
      throw new Error(`Unknown model: ${model}`);
  }
}
