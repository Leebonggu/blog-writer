import { describe, it, expect, vi, beforeEach } from "vitest";
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
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("scrapes store info via GraphQL API", async () => {
    const mockGraphQLResponse = {
      data: {
        placeDetail: {
          base: {
            name: "맛있는 치킨집",
            category: "한식",
            roadAddress: "서울시 강남구 역삼동 123",
            address: "서울 강남구",
            phone: "02-1234-5678",
          },
          newBusinessHours: [
            {
              name: null,
              businessStatusDescription: { status: "영업 중", description: "23:00에 영업 종료" },
              businessHours: [
                {
                  day: "월",
                  businessHours: { start: "11:00", end: "23:00" },
                  breakHours: [{ start: "15:00", end: "17:00" }],
                  description: null,
                  lastOrderTimes: [{ type: "영업시간", time: "22:30" }],
                },
                {
                  day: "화",
                  businessHours: { start: "11:00", end: "23:00" },
                  breakHours: [{ start: "15:00", end: "17:00" }],
                  description: null,
                  lastOrderTimes: [{ type: "영업시간", time: "22:30" }],
                },
              ],
            },
          ],
          menus: [
            { name: "후라이드치킨", price: "18000", recommend: true, description: null },
            { name: "양념치킨", price: "19000", recommend: false, description: null },
            { name: "이벤트 배너", price: "0", recommend: true, description: "홍보용" },
          ],
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGraphQLResponse),
    });

    const scraper = new NaverMapScraper();
    const result = await scraper.scrape("https://map.naver.com/v5/entry/place/1234567");

    expect(result.address).toBe("서울시 강남구 역삼동 123");
    expect(result.category).toBe("한식");
    expect(result.phone).toBe("02-1234-5678");
    expect(result.menus).toHaveLength(2);
    expect(result.menus[0].name).toBe("후라이드치킨");
    expect(result.menus[0].price).toBe("18,000원");
    expect(result.businessHours).toContain("영업 중");
    expect(result.businessHours).toContain("11:00~23:00");
    expect(result.businessHours).toContain("브레이크타임");
    expect(result.businessHours).toContain("라스트오더");
  });

  it("falls back to Apollo State when GraphQL fails", async () => {
    const mockApolloHtml = `
      <html><body>
      <script>
      window.__APOLLO_STATE__ = {"PlaceDetailBase:999":{"__typename":"PlaceDetailBase","id":"999","name":"테스트가게","category":"양식","roadAddress":"서울시 마포구","address":"마포구","phone":"02-9999-0000"},"Menu:999_1":{"__typename":"Menu","name":"파스타","price":"15000","recommend":true}};
      </script>
      </body></html>
    `;

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      callCount++;
      if (callCount === 1) {
        // GraphQL call fails
        return Promise.resolve({ ok: false, status: 500 });
      }
      // Fallback HTML call
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockApolloHtml),
      });
    });

    const scraper = new NaverMapScraper();
    const result = await scraper.scrape("https://map.naver.com/v5/entry/place/999");

    expect(result.address).toBe("서울시 마포구");
    expect(result.category).toBe("양식");
    expect(result.menus[0].name).toBe("파스타");
  });

  it("throws on invalid URL", async () => {
    const scraper = new NaverMapScraper();
    await expect(scraper.scrape("https://google.com")).rejects.toThrow("유효하지 않은 네이버 지도 URL입니다");
  });

  it("throws when both GraphQL and Apollo state fail", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve("<html><body>No data</body></html>"),
      });
    });

    const scraper = new NaverMapScraper();
    await expect(scraper.scrape("https://map.naver.com/v5/entry/place/999")).rejects.toThrow("페이지에서 데이터를 추출할 수 없습니다");
  });

  it("summarizes business hours with day grouping", async () => {
    const mockResponse = {
      data: {
        placeDetail: {
          base: { name: "테스트", category: "한식", roadAddress: "서울", address: "", phone: "" },
          newBusinessHours: [
            {
              name: null,
              businessStatusDescription: null,
              businessHours: [
                { day: "월", businessHours: { start: "11:00", end: "22:00" }, breakHours: [], description: null, lastOrderTimes: [] },
                { day: "화", businessHours: { start: "11:00", end: "22:00" }, breakHours: [], description: null, lastOrderTimes: [] },
                { day: "수", businessHours: { start: "11:00", end: "22:00" }, breakHours: [], description: null, lastOrderTimes: [] },
                { day: "목", businessHours: { start: "11:00", end: "22:00" }, breakHours: [], description: null, lastOrderTimes: [] },
                { day: "금", businessHours: { start: "11:00", end: "23:00" }, breakHours: [], description: null, lastOrderTimes: [] },
                { day: "토", businessHours: { start: "11:00", end: "23:00" }, breakHours: [], description: null, lastOrderTimes: [] },
                { day: "일", businessHours: null, breakHours: [], description: null, lastOrderTimes: [] },
              ],
            },
          ],
          menus: [],
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const scraper = new NaverMapScraper();
    const result = await scraper.scrape("https://m.place.naver.com/restaurant/123/home");

    // Should group Mon-Thu (same hours) and Fri-Sat (same hours) and Sun (day off)
    expect(result.businessHours).toContain("월~목 11:00~22:00");
    expect(result.businessHours).toContain("금~토 11:00~23:00");
    expect(result.businessHours).toContain("일 휴무");
  });
});
