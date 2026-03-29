import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenAIProvider } from "@/features/llm/openai-provider";

vi.mock("openai", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Generated blog post" } }],
  });
  class MockOpenAI {
    chat = { completions: { create: mockCreate } };
  }
  return {
    default: MockOpenAI,
  };
});

describe("OpenAIProvider", () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider("test-api-key");
  });

  it("generates text without images", async () => {
    const result = await provider.generateText("Write a review", "You are a blogger");
    expect(result).toBe("Generated blog post");
  });

  it("generates text with images", async () => {
    const fakeBase64 = "data:image/jpeg;base64,/9j/4AAQ...";
    const result = await provider.generateText("Describe this food", "You are a blogger", [fakeBase64]);
    expect(result).toBe("Generated blog post");
  });
});
