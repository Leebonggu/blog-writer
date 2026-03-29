import { describe, it, expect, vi } from "vitest";
import { NaverMapScraper, extractPlaceId } from "@/features/scraper/naver-map-scraper";

describe("extractPlaceId", () => {
  it("extracts place ID from standard URL", () => {
    expect(extractPlaceId("https://map.naver.com/v5/entry/place/1234567")).toBe("1234567");
  });

  it("extracts place ID from /p/entry/place URL", () => {
    expect(extractPlaceId("https://map.naver.com/p/entry/place/1142676408?lng=127")).toBe("1142676408");
  });

  it("extracts place ID from search result URL", () => {
    expect(extractPlaceId("https://map.naver.com/v5/search/치킨/place/1234567")).toBe("1234567");
  });

  it("extracts place ID from mobile restaurant URL", () => {
    expect(extractPlaceId("https://m.place.naver.com/restaurant/1234567/home")).toBe("1234567");
  });

  it("extracts place ID from mobile cafe URL", () => {
    expect(extractPlaceId("https://m.place.naver.com/cafe/9876543")).toBe("9876543");
  });

  it("extracts place ID from mobile hotel URL", () => {
    expect(extractPlaceId("https://m.place.naver.com/hotel/5555555")).toBe("5555555");
  });

  it("returns null for naver.me short URL (no place ID)", () => {
    expect(extractPlaceId("https://naver.me/xAbCdEf")).toBe(null);
  });

  it("returns null for invalid URL", () => {
    expect(extractPlaceId("https://google.com")).toBe(null);
  });
});

describe("NaverMapScraper", () => {
  it("scrapes store info from mobile page Apollo state", async () => {
    const mockHtml = `
      <html><body>
      <script>
      window.__APOLLO_STATE__ = {"PlaceDetailBase:1234567":{"__typename":"PlaceDetailBase","id":"1234567","name":"맛있는 치킨집","category":"한식","roadAddress":"서울시 강남구 역삼동 123","address":"서울 강남구","phone":"02-1234-5678"},"Menu:1234567_1":{"__typename":"Menu","name":"후라이드치킨","price":"18000","recommend":true},"Menu:1234567_2":{"__typename":"Menu","name":"양념치킨","price":"19000","recommend":false}};
      </script>
      </body></html>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    const scraper = new NaverMapScraper();
    const result = await scraper.scrape("https://map.naver.com/v5/entry/place/1234567");

    expect(result.address).toBe("서울시 강남구 역삼동 123");
    expect(result.category).toBe("한식");
    expect(result.menus).toHaveLength(2);
    expect(result.menus[0].name).toBe("후라이드치킨");
    expect(result.menus[0].price).toBe("18,000원");
  });

  it("throws on invalid URL", async () => {
    const scraper = new NaverMapScraper();
    await expect(scraper.scrape("https://google.com")).rejects.toThrow("유효하지 않은 네이버 지도 URL입니다");
  });

  it("throws when Apollo state is not found", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("<html><body>No data</body></html>"),
    });

    const scraper = new NaverMapScraper();
    await expect(scraper.scrape("https://map.naver.com/v5/entry/place/999")).rejects.toThrow("페이지에서 데이터를 추출할 수 없습니다");
  });
});
