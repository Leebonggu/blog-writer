import { describe, it, expect } from "vitest";
import { parseNaverPlaceData } from "@/features/scraper/parser";

describe("parseNaverPlaceData", () => {
  it("parses full place data", () => {
    const raw = {
      basicInfo: {
        address: "서울시 강남구 역삼동 123-4",
        businessHours: {
          status: { text: "영업중" },
          regularHours: [{ day: "매일", time: "11:00 - 22:00" }],
        },
        category: "한식",
        phone: "02-1234-5678",
      },
      menus: [
        { name: "후라이드치킨", price: "18000" },
        { name: "양념치킨", price: "19000" },
      ],
    };

    const result = parseNaverPlaceData(raw);

    expect(result).toEqual({
      address: "서울시 강남구 역삼동 123-4",
      businessHours: "매일 11:00 - 22:00",
      menus: [
        { name: "후라이드치킨", price: "18,000원" },
        { name: "양념치킨", price: "19,000원" },
      ],
      category: "한식",
      phone: "02-1234-5678",
    });
  });

  it("handles missing optional fields", () => {
    const raw = {
      basicInfo: {
        address: "서울시 강남구",
        category: "양식",
      },
    };

    const result = parseNaverPlaceData(raw);

    expect(result).toEqual({
      address: "서울시 강남구",
      businessHours: "",
      menus: [],
      category: "양식",
      phone: "",
    });
  });
});
