import { describe, it, expect, vi } from "vitest";

vi.mock("@/features/scraper/naver-map-scraper", () => ({
  NaverMapScraper: vi.fn().mockImplementation(function () {
    return {
      scrape: vi.fn().mockResolvedValue({
        address: "서울시 강남구",
        businessHours: "매일 11:00 - 22:00",
        menus: [{ name: "치킨", price: "18,000원" }],
        category: "한식",
        phone: "02-1234-5678",
      }),
    };
  }),
}));

import { POST } from "@/app/api/scrape/route";

describe("POST /api/scrape", () => {
  it("returns store info for valid URL", async () => {
    const request = new Request("http://localhost/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://map.naver.com/v5/entry/place/123" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.address).toBe("서울시 강남구");
  });

  it("returns 400 for missing URL", async () => {
    const request = new Request("http://localhost/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
