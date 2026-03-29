import type { StoreInfo, StoreInfoScraper } from "./types";
import { parseNaverPlaceData } from "./parser";

export function extractPlaceId(url: string): string | null {
  const patterns = [
    /place\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export class NaverMapScraper implements StoreInfoScraper {
  async scrape(url: string): Promise<StoreInfo> {
    const placeId = extractPlaceId(url);
    if (!placeId) {
      throw new Error("유효하지 않은 네이버 지도 URL입니다");
    }

    const apiUrl = `https://map.naver.com/p/api/search/allSearch?query=${placeId}&type=place`;
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://map.naver.com/",
      },
    });

    if (!response.ok) {
      throw new Error(`크롤링 실패: ${response.status}`);
    }

    const data = await response.json();
    return parseNaverPlaceData(data);
  }
}
