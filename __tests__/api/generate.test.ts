import { describe, it, expect, vi } from "vitest";

vi.mock("@/features/llm/provider-factory", () => ({
  createProvider: vi.fn().mockReturnValue({
    generateText: vi.fn().mockResolvedValue('<p>맛있는 치킨 리뷰입니다!</p>\n[IMAGE_1] <!-- 외관 -->'),
  }),
}));

import { POST } from "@/app/api/generate/route";

describe("POST /api/generate", () => {
  it("returns generated blog post", async () => {
    const request = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeName: "맛있는 치킨집",
        storeInfo: {
          address: "서울시 강남구",
          businessHours: "매일 11:00 - 22:00",
          menus: [{ name: "치킨", price: "18,000원" }],
          category: "한식",
          phone: "02-1234-5678",
        },
        sponsorType: "self-paid",
        images: [],
        tonePresetId: "friendly",
        useVision: false,
        model: "claude-sonnet",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.html).toContain("치킨");
    expect(data.plainText).toBeTruthy();
    expect(data.imageGuide).toBeDefined();
  });

  it("returns 400 for missing storeName", async () => {
    const request = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeInfo: {} }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
