import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClaudeProvider } from "@/features/llm/claude-provider";

vi.mock("@anthropic-ai/sdk", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "Generated blog post" }],
  });
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return {
    default: MockAnthropic,
  };
});

describe("ClaudeProvider", () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    provider = new ClaudeProvider("test-api-key");
  });

  it("generates text without images", async () => {
    const result = await provider.generateText("Write a review", "You are a blogger");
    expect(result).toBe("Generated blog post");
  });

  it("generates text with images as base64", async () => {
    const fakeBase64 = "data:image/jpeg;base64,/9j/4AAQ...";
    const result = await provider.generateText("Describe this food", "You are a blogger", [fakeBase64]);
    expect(result).toBe("Generated blog post");
  });
});
