import { NextResponse } from "next/server";
import { createProvider } from "@/features/llm/provider-factory";
import { generateBlogPost } from "@/features/blog/blog-generator";
import type { BlogInput } from "@/features/blog/types";
import type { StoreInfo } from "@/features/scraper/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { storeName, storeInfo, sponsorType, sponsorName, images, tonePresetId, referenceText, requiredPhrases, useVision, model } = body;

  if (!storeName || !storeInfo) {
    return NextResponse.json({ error: "storeName and storeInfo are required" }, { status: 400 });
  }

  try {
    const provider = createProvider(model ?? "claude-sonnet", {
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
    });

    const input: BlogInput = {
      storeName,
      naverMapUrl: "",
      sponsorType: sponsorType ?? "self-paid",
      sponsorName,
      images: images ?? [],
      tonePresetId: tonePresetId ?? "friendly",
      referenceText,
      requiredPhrases,
      useVision: useVision ?? true,
      model: model ?? "claude-sonnet",
    };

    const result = await generateBlogPost(input, storeInfo as StoreInfo, provider);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "글 생성에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
