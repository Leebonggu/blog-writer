import type { BlogInput, BlogOutput, ImagePlacement } from "./types";
import type { StoreInfo } from "@/features/scraper/types";
import type { LLMProvider } from "@/features/llm/types";
import { buildPrompt } from "./prompt-builder";

async function analyzeTone(referenceText: string, provider: LLMProvider): Promise<string> {
  const prompt = `다음 블로그 글의 문체 특징을 분석해주세요. 종결어미, 어투, 문장 길이, 특징적인 표현 패턴을 간결하게 정리해주세요.

---
${referenceText}
---

문체 특징:`;

  return provider.generateText(prompt, "당신은 문체 분석 전문가입니다. 간결하게 핵심만 답변하세요.");
}

async function analyzeImages(images: string[], provider: LLMProvider): Promise<string[]> {
  const prompt = `업로드된 ${images.length}장의 이미지를 각각 한 줄로 설명해주세요. 음식, 매장 외관, 인테리어 등 블로그 리뷰에 활용할 수 있는 관점에서 묘사해주세요.

형식:
1. (설명)
2. (설명)
...`;

  const result = await provider.generateText(prompt, "당신은 음식/매장 사진 분석 전문가입니다.", images);

  return result
    .split("\n")
    .filter((line) => /^\d+\./.test(line.trim()))
    .map((line) => line.replace(/^\d+\.\s*/, "").trim());
}

function extractImageGuide(html: string): ImagePlacement[] {
  const regex = /\[IMAGE_(\d+)\]\s*(?:<!--\s*(.+?)\s*-->)?/g;
  const placements: ImagePlacement[] = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    placements.push({
      imageIndex: parseInt(match[1], 10),
      position: `글 내 ${match.index}번째 위치`,
      description: match[2]?.trim() ?? `이미지 ${match[1]}`,
    });
  }

  return placements;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\[IMAGE_\d+\]\s*(?:<!--.*?-->)?/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function generateBlogPost(
  input: BlogInput,
  storeInfo: StoreInfo,
  provider: LLMProvider,
): Promise<BlogOutput> {
  // Step 1: Analyze reference tone if custom
  let customToneInstruction: string | undefined;
  if (input.tonePresetId === "custom" && input.referenceText) {
    customToneInstruction = await analyzeTone(input.referenceText, provider);
  }

  // Step 2: Analyze images if vision is ON
  let visionDescriptions: string[] | undefined;
  if (input.useVision && input.images.length > 0) {
    visionDescriptions = await analyzeImages(input.images, provider);
  }

  // Step 3: Build prompt and generate
  const { systemPrompt, userPrompt } = buildPrompt({
    category: input.category ?? "restaurant",
    storeName: input.storeName,
    storeInfo,
    tonePresetId: input.tonePresetId,
    customToneInstruction,
    sponsorType: input.sponsorType,
    sponsorName: input.sponsorName,
    imageCount: input.images.length,
    requiredPhrases: input.requiredPhrases,
    personalNote: input.personalNote,
    revisitIntent: input.revisitIntent ?? "definitely",
    includeHonestReview: input.includeHonestReview,
    visionDescriptions,
  });

  const raw = await provider.generateText(userPrompt, systemPrompt);

  // Extract title from [TITLE]...[/TITLE] tag
  const titleMatch = raw.match(/\[TITLE\](.*?)\[\/TITLE\]/);
  const title = titleMatch ? titleMatch[1].trim() : input.storeName;
  const html = raw.replace(/\[TITLE\].*?\[\/TITLE\]\s*/, "").trim();

  return {
    title,
    html,
    plainText: htmlToPlainText(html),
    imageGuide: extractImageGuide(html),
  };
}
