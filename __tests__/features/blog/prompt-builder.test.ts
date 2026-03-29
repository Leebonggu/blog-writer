import { describe, it, expect } from "vitest";
import { buildPrompt } from "@/features/blog/prompt-builder";
import type { StoreInfo } from "@/features/scraper/types";

const mockStoreInfo: StoreInfo = {
  address: "서울시 강남구 역삼동 123-4",
  businessHours: "매일 11:00 - 22:00",
  menus: [
    { name: "후라이드치킨", price: "18,000원" },
    { name: "양념치킨", price: "19,000원" },
  ],
  category: "한식",
  phone: "02-1234-5678",
};

describe("buildPrompt", () => {
  it("builds prompt with store info and tone", () => {
    const result = buildPrompt({
      category: "restaurant",
      storeName: "맛있는 치킨집",
      storeInfo: mockStoreInfo,
      tonePresetId: "friendly",
      sponsorType: "self-paid",
      imageCount: 5,
      revisitIntent: "definitely",
    });

    expect(result.systemPrompt).toContain("네이버 블로그 맛집 리뷰");
    expect(result.systemPrompt).toContain("친근");
    expect(result.userPrompt).toContain("맛있는 치킨집");
    expect(result.userPrompt).toContain("서울시 강남구");
    expect(result.userPrompt).toContain("후라이드치킨");
    expect(result.userPrompt).toContain("총 5장의 이미지가 업로드되었습니다");
  });

  it("includes sponsor info for sponsored posts", () => {
    const result = buildPrompt({
      category: "restaurant",
      storeName: "맛있는 치킨집",
      storeInfo: mockStoreInfo,
      tonePresetId: "informative",
      sponsorType: "sponsored",
      sponsorName: "OO치킨 본사",
      imageCount: 3,
      revisitIntent: "definitely",
    });

    expect(result.userPrompt).toContain("협찬");
    expect(result.userPrompt).toContain("OO치킨 본사");
  });

  it("includes required phrases", () => {
    const result = buildPrompt({
      category: "restaurant",
      storeName: "맛있는 치킨집",
      storeInfo: mockStoreInfo,
      tonePresetId: "friendly",
      sponsorType: "self-paid",
      imageCount: 3,
      requiredPhrases: "바삭바삭한 치킨",
    });

    expect(result.userPrompt).toContain("바삭바삭한 치킨");
  });

  it("includes custom tone from reference analysis", () => {
    const result = buildPrompt({
      category: "restaurant",
      storeName: "맛있는 치킨집",
      storeInfo: mockStoreInfo,
      tonePresetId: "custom",
      customToneInstruction: "짧은 문장, ~했다 체, 감성적",
      sponsorType: "self-paid",
      imageCount: 3,
      revisitIntent: "definitely",
    });

    expect(result.systemPrompt).toContain("짧은 문장");
  });

  it("includes vision analysis results when provided", () => {
    const result = buildPrompt({
      category: "restaurant",
      storeName: "맛있는 치킨집",
      storeInfo: mockStoreInfo,
      tonePresetId: "friendly",
      sponsorType: "self-paid",
      imageCount: 3,
      visionDescriptions: ["바삭한 후라이드치킨 클로즈업", "아늑한 내부 인테리어"],
    });

    expect(result.userPrompt).toContain("바삭한 후라이드치킨 클로즈업");
  });
});
