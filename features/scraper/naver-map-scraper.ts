import type { StoreInfo, StoreInfoScraper } from "./types";

export function extractPlaceId(url: string): string | null {
  const match = url.match(/(?:place|restaurant|cafe|hotel)\/(\d+)/);
  return match ? match[1] : null;
}

async function resolveShortUrl(url: string): Promise<string> {
  if (!url.includes("naver.me")) return url;

  const response = await fetch(url, { redirect: "manual" });
  const location = response.headers.get("location");
  if (location) return location;

  return url;
}

const PLACE_DETAIL_QUERY = `
  query {
    placeDetail(input: { id: "$PLACE_ID" }) {
      base {
        name
        category
        roadAddress
        address
        phone
      }
      newBusinessHours {
        name
        businessStatusDescription {
          status
          description
        }
        businessHours {
          day
          businessHours {
            start
            end
          }
          breakHours {
            start
            end
          }
          description
          lastOrderTimes {
            type
            time
          }
        }
      }
      menus {
        name
        price
        recommend
        description
      }
    }
  }
`;

interface GraphQLBusinessHour {
  day: string;
  businessHours: { start: string; end: string } | null;
  breakHours: { start: string; end: string }[];
  description: string | null;
  lastOrderTimes: { type: string; time: string }[];
}

interface GraphQLNewBusinessHours {
  name: string | null;
  businessStatusDescription: { status: string; description: string | null } | null;
  businessHours: GraphQLBusinessHour[];
}

interface GraphQLMenu {
  name: string;
  price: string;
  recommend: boolean;
  description: string | null;
}

interface GraphQLResponse {
  data: {
    placeDetail: {
      base: {
        name: string;
        category: string;
        roadAddress: string;
        address: string;
        phone: string | null;
      };
      newBusinessHours: GraphQLNewBusinessHours[];
      menus: GraphQLMenu[];
    } | null;
  };
  errors?: { message: string }[];
}

function summarizeBusinessHours(newBusinessHours: GraphQLNewBusinessHours[]): string {
  if (!newBusinessHours || newBusinessHours.length === 0) return "";

  const entry = newBusinessHours[0];
  const hours = entry.businessHours;
  if (!hours || hours.length === 0) return "";

  // Group consecutive days with the same hours
  const groups: { days: string[]; start: string; end: string; breakHours: string; lastOrder: string; desc: string }[] = [];

  for (const h of hours) {
    if (!h.businessHours) {
      // Day off
      groups.push({ days: [h.day], start: "", end: "", breakHours: "", lastOrder: "", desc: h.description || "휴무" });
      continue;
    }

    const start = h.businessHours.start;
    const end = h.businessHours.end;
    const breakStr = h.breakHours?.length > 0
      ? h.breakHours.map((b) => `${b.start}~${b.end}`).join(", ")
      : "";
    const lastOrder = h.lastOrderTimes?.length > 0
      ? h.lastOrderTimes.map((l) => l.time).join(", ")
      : "";
    const desc = h.description || "";

    const last = groups[groups.length - 1];
    if (last && last.start === start && last.end === end && last.breakHours === breakStr && last.lastOrder === lastOrder && last.desc === desc) {
      last.days.push(h.day);
    } else {
      groups.push({ days: [h.day], start, end, breakHours: breakStr, lastOrder, desc });
    }
  }

  const lines: string[] = [];

  for (const g of groups) {
    const dayLabel = g.days.length >= 7
      ? "매일"
      : g.days.length === 1
        ? g.days[0]
        : `${g.days[0]}~${g.days[g.days.length - 1]}`;

    if (!g.start) {
      lines.push(`${dayLabel} ${g.desc}`);
      continue;
    }

    let line = `${dayLabel} ${g.start}~${g.end}`;
    if (g.breakHours) line += ` (브레이크타임 ${g.breakHours})`;
    if (g.lastOrder) line += ` (라스트오더 ${g.lastOrder})`;
    if (g.desc) line += ` ${g.desc}`;
    lines.push(line);
  }

  // Add current status if available
  const status = entry.businessStatusDescription;
  if (status?.status) {
    lines.unshift(status.description ? `${status.status} (${status.description})` : status.status);
  }

  return lines.join("\n");
}

function parseMenus(menus: GraphQLMenu[]): { name: string; price: string }[] {
  return menus
    .filter((m) => {
      const price = parseInt(m.price, 10);
      return !isNaN(price) && price > 0;
    })
    .map((m) => {
      const priceNum = parseInt(m.price, 10);
      return {
        name: m.name,
        price: priceNum.toLocaleString("ko-KR") + "원",
      };
    });
}

async function fetchViaGraphQL(placeId: string): Promise<StoreInfo> {
  const query = PLACE_DETAIL_QUERY.replace("$PLACE_ID", placeId);

  const response = await fetch("https://pcmap-api.place.naver.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      "Referer": "https://m.place.naver.com/",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL API 요청 실패: ${response.status}`);
  }

  const result: GraphQLResponse = await response.json();

  if (result.errors?.length) {
    throw new Error(`GraphQL 오류: ${result.errors[0].message}`);
  }

  const detail = result.data?.placeDetail;
  if (!detail) {
    throw new Error("가게 정보를 찾을 수 없습니다");
  }

  return {
    address: detail.base.roadAddress || detail.base.address || "",
    businessHours: summarizeBusinessHours(detail.newBusinessHours),
    menus: parseMenus(detail.menus ?? []),
    category: detail.base.category || "",
    phone: detail.base.phone || "",
  };
}

// Fallback: Apollo State parsing (legacy, in case GraphQL API is blocked)
function extractApolloState(html: string): Record<string, any> | null {
  const match = html.match(/window\.__APOLLO_STATE__\s*=\s*({.*?});\s*\n/);
  if (!match) return null;
  return JSON.parse(match[1]);
}

function parseApolloState(state: Record<string, any>, placeId: string): StoreInfo {
  const baseKey = `PlaceDetailBase:${placeId}`;
  const base = state[baseKey] ?? {};

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
      if (v.price === "0" || v.price === null) continue;
      const priceNum = parseInt(v.price, 10);
      menus.push({
        name: v.name,
        price: isNaN(priceNum) ? v.price : priceNum.toLocaleString("ko-KR") + "원",
      });
    }
  }

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

    // Primary: GraphQL API
    try {
      return await fetchViaGraphQL(placeId);
    } catch {
      // Fallback: Apollo State from HTML
    }

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
