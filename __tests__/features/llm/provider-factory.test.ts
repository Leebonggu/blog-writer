import { describe, it, expect, vi } from "vitest";
import { createProvider } from "@/features/llm/provider-factory";
import { ClaudeProvider } from "@/features/llm/claude-provider";
import { OpenAIProvider } from "@/features/llm/openai-provider";

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: vi.fn() };
  }
  return { default: MockAnthropic };
});

vi.mock("openai", () => {
  class MockOpenAI {
    chat = { completions: { create: vi.fn() } };
  }
  return { default: MockOpenAI };
});

describe("createProvider", () => {
  it("creates ClaudeProvider for claude-sonnet", () => {
    const provider = createProvider("claude-sonnet", { anthropicApiKey: "test" });
    expect(provider).toBeInstanceOf(ClaudeProvider);
  });

  it("creates OpenAIProvider for gpt-4o", () => {
    const provider = createProvider("gpt-4o", { openaiApiKey: "test" });
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it("throws for unknown model", () => {
    expect(() => createProvider("unknown" as any, {})).toThrow();
  });
});
