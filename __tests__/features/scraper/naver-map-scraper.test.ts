import { describe, it, expect, vi } from "vitest";
import { NaverMapScraper, extractPlaceId } from "@/features/scraper/naver-map-scraper";

describe("extractPlaceId", () => {
  it("extracts place ID from standard URL", () => {
    expect(extractPlaceId("https://map.naver.com/v5/entry/place/1234567")).toBe("1234567");
  });

  it("extracts place ID from search result URL", () => {
    expect(extractPlaceId("https://map.naver.com/v5/search/치킨/place/1234567")).toBe("1234567");
  });

  it("extracts place ID from naver.me short URL place pattern", () => {
    expect(extractPlaceId("https://naver.me/xAbCdEf")).toBe(null);
  });

  it("returns null for invalid URL", () => {
    expect(extractPlaceId("https://google.com")).toBe(null);
  });
});

describe("NaverMapScraper", () => {
  it("scrapes store info from place ID", async () => {
    const mockResponse = {
      basicInfo: {
        address: "서울시 강남구",
        category: "한식",
        phone: "02-1234-5678",
      },
      menus: [{ name: "치킨", price: "18000" }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const scraper = new NaverMapScraper();
    const result = await scraper.scrape("https://map.naver.com/v5/entry/place/1234567");

    expect(result.address).toBe("서울시 강남구");
    expect(result.category).toBe("한식");
    expect(result.menus).toHaveLength(1);
  });

  it("throws on invalid URL", async () => {
    const scraper = new NaverMapScraper();
    await expect(scraper.scrape("https://google.com")).rejects.toThrow("유효하지 않은 네이버 지도 URL입니다");
  });
});
