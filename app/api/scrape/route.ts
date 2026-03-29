import { NextResponse } from "next/server";
import { NaverMapScraper } from "@/features/scraper/naver-map-scraper";

export async function POST(request: Request) {
  const body = await request.json();
  const { url } = body;

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const scraper = new NaverMapScraper();
    const storeInfo = await scraper.scrape(url);
    return NextResponse.json(storeInfo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "크롤링에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
