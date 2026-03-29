import type { StoreInfo } from "./types";

function formatPrice(price: string): string {
  const num = parseInt(price, 10);
  if (isNaN(num)) return price;
  return num.toLocaleString("ko-KR") + "원";
}

export function parseNaverPlaceData(raw: any): StoreInfo {
  const basic = raw.basicInfo ?? {};
  const hours = basic.businessHours?.regularHours ?? [];
  const businessHours = hours.map((h: any) => `${h.day} ${h.time}`).join(", ");

  const menus = (raw.menus ?? []).map((m: any) => ({
    name: m.name ?? "",
    price: m.price ? formatPrice(m.price) : "",
  }));

  return {
    address: basic.address ?? "",
    businessHours,
    menus,
    category: basic.category ?? "",
    phone: basic.phone ?? "",
  };
}
