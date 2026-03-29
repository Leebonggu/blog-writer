import type { StoreInfo, StoreInfoScraper } from "./types";

export function extractPlaceId(url: string): string | null {
  const match = url.match(/place\/(\d+)/);
  return match ? match[1] : null;
}

async function resolveShortUrl(url: string): Promise<string> {
  if (!url.includes("naver.me")) return url;

  const response = await fetch(url, { redirect: "manual" });
  const location = response.headers.get("location");
  if (location) return location;

  return url;
}

function extractApolloState(html: string): Record<string, any> | null {
  const match = html.match(/window\.__APOLLO_STATE__\s*=\s*({.*?});\s*\n/s);
  if (!match) return null;
  return JSON.parse(match[1]);
}

function parseApolloState(state: Record<string, any>, placeId: string): StoreInfo {
  // Extract base info from PlaceDetailBase
  const baseKey = `PlaceDetailBase:${placeId}`;
  const base = state[baseKey] ?? {};

  // Extract menus from Menu entries
  const menus: { name: string; price: string }[] = [];
  for (const [key, value] of Object.entries(state)) {
    if (
      key.startsWith("Menu:") &&
      typeof value === "object" &&
      value !== null &&
      "name" in value &&
      "price" in value
    ) {
      const v = value as any;
      // Skip promotional/header items (price "0" with no real menu name)
      if (v.price === "0" || v.price === null) continue;
      const priceNum = parseInt(v.price, 10);
      menus.push({
        name: v.name,
        price: isNaN(priceNum) ? v.price : priceNum.toLocaleString("ko-KR") + "원",
      });
    }
  }

  // Extract business hours from BusinessHours entries
  let businessHours = "";
  for (const [key, value] of Object.entries(state)) {
    if (key.includes("BusinessHour") && typeof value === "object" && value !== null) {
      const v = value as any;
      if (v.businessHours || v.openTime) {
        businessHours = v.businessHours ?? `${v.openTime ?? ""} - ${v.closeTime ?? ""}`;
        break;
      }
    }
  }

  return {
    address: base.roadAddress ?? base.address ?? "",
    businessHours,
    menus,
    category: base.category ?? "",
    phone: base.phone ?? "",
  };
}

export class NaverMapScraper implements StoreInfoScraper {
  async scrape(url: string): Promise<StoreInfo> {
    const resolvedUrl = await resolveShortUrl(url);
    const placeId = extractPlaceId(resolvedUrl);
    if (!placeId) {
      throw new Error("유효하지 않은 네이버 지도 URL입니다");
    }

    // Fetch mobile place page (contains __APOLLO_STATE__ with all data)
    const mobileUrl = `https://m.place.naver.com/restaurant/${placeId}/home`;
    const response = await fetch(mobileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      },
    });

    if (!response.ok) {
      throw new Error(`크롤링 실패: ${response.status}`);
    }

    const html = await response.text();
    const apolloState = extractApolloState(html);

    if (!apolloState) {
      throw new Error("페이지에서 데이터를 추출할 수 없습니다");
    }

    return parseApolloState(apolloState, placeId);
  }
}
