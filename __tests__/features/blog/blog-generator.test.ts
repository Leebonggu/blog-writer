import { describe, it, expect, vi } from "vitest";
import { generateBlogPost } from "@/features/blog/blog-generator";
import type { BlogInput } from "@/features/blog/types";
import type { StoreInfo } from "@/features/scraper/types";
import type { LLMProvider } from "@/features/llm/types";

describe("generateBlogPost", () => {
  const mockStoreInfo: StoreInfo = {
    address: "서울시 강남구",
    businessHours: "매일 11:00 - 22:00",
    menus: [{ name: "치킨", price: "18,000원" }],
    category: "한식",
    phone: "02-1234-5678",
  };

  const mockProvider: LLMProvider = {
    generateText: vi.fn()
      .mockResolvedValueOnce(
        "1. 바삭한 치킨 클로즈업\n2. 깔끔한 매장 내부"
      )
      .mockResolvedValueOnce(
        '<p>오늘은 맛있는 치킨집을 방문했어요!</p>\n[IMAGE_1] <!-- 외관 -->\n<p>치킨이 정말 바삭해요.</p>\n[IMAGE_2] <!-- 치킨 -->'
      ),
  };

  const baseInput: BlogInput = {
    storeName: "맛있는 치킨집",
    naverMapUrl: "https://map.naver.com/v5/entry/place/123",
    sponsorType: "self-paid",
    images: ["data:image/jpeg;base64,abc", "data:image/jpeg;base64,def"],
    tonePresetId: "friendly",
    useVision: true,
    model: "claude-sonnet",
  };

  it("generates blog post with vision analysis", async () => {
    const result = await generateBlogPost(baseInput, mockStoreInfo, mockProvider);

    expect(result.html).toContain("치킨");
    expect(result.plainText).toBeTruthy();
    expect(result.imageGuide).toBeDefined();
    expect(mockProvider.generateText).toHaveBeenCalledTimes(2);
  });

  it("generates blog post without vision analysis", async () => {
    const noVisionProvider: LLMProvider = {
      generateText: vi.fn().mockResolvedValueOnce(
        '<p>오늘은 맛있는 치킨집!</p>\n[IMAGE_1] <!-- 외관 -->'
      ),
    };

    const result = await generateBlogPost(
      { ...baseInput, useVision: false },
      mockStoreInfo,
      noVisionProvider,
    );

    expect(result.html).toContain("치킨");
    expect(noVisionProvider.generateText).toHaveBeenCalledTimes(1);
  });

  it("handles reference text for custom tone", async () => {
    const customProvider: LLMProvider = {
      generateText: vi.fn()
        .mockResolvedValueOnce("짧은 문장체, 감성적, ~했다 종결") // tone analysis
        .mockResolvedValueOnce("1. 이미지 분석 결과") // vision
        .mockResolvedValueOnce('<p>결과물</p>'), // generation
    };

    const result = await generateBlogPost(
      { ...baseInput, tonePresetId: "custom", referenceText: "참고할 블로그 글..." },
      mockStoreInfo,
      customProvider,
    );

    expect(result.html).toContain("결과물");
    expect(customProvider.generateText).toHaveBeenCalledTimes(3);
  });
});
