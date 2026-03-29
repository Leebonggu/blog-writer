import type { TonePresetId } from "./types";
import type { StoreInfo } from "@/features/scraper/types";
import { getTonePreset } from "./tone-presets";
import { RESTAURANT_SYSTEM_PROMPT } from "./templates/restaurant";

interface PromptInput {
  storeName: string;
  storeInfo: StoreInfo;
  tonePresetId: TonePresetId | "custom";
  customToneInstruction?: string;
  sponsorType: "self-paid" | "sponsored";
  sponsorName?: string;
  imageCount: number;
  requiredPhrases?: string;
  visionDescriptions?: string[];
}

interface PromptOutput {
  systemPrompt: string;
  userPrompt: string;
}

export function buildPrompt(input: PromptInput): PromptOutput {
  let toneInstruction: string;
  if (input.tonePresetId === "custom" && input.customToneInstruction) {
    toneInstruction = `다음 문체 스타일을 따라 작성해주세요:\n${input.customToneInstruction}`;
  } else {
    const preset = getTonePreset(input.tonePresetId as TonePresetId);
    toneInstruction = preset?.promptInstruction ?? "";
  }

  const systemPrompt = `${RESTAURANT_SYSTEM_PROMPT}\n\n## 문체\n${toneInstruction}`;

  const parts: string[] = [];

  parts.push(`## 상호명\n${input.storeName}`);

  parts.push(`## 가게 정보
- 주소: ${input.storeInfo.address}
- 영업시간: ${input.storeInfo.businessHours || "정보 없음"}
- 전화번호: ${input.storeInfo.phone || "정보 없음"}
- 카테고리: ${input.storeInfo.category}`);

  if (input.storeInfo.menus.length > 0) {
    const menuList = input.storeInfo.menus.map((m) => `- ${m.name}: ${m.price}`).join("\n");
    parts.push(`## 메뉴\n${menuList}`);
  }

  if (input.sponsorType === "sponsored") {
    parts.push(`## 협찬 정보\n협찬 업체: ${input.sponsorName ?? "업체명 미입력"}`);
  } else {
    parts.push(`## 내돈내산\n직접 방문하여 작성하는 솔직한 후기입니다.`);
  }

  parts.push(`## 이미지\n이미지 ${input.imageCount}장이 업로드되었습니다. [IMAGE_1]~[IMAGE_${input.imageCount}] 마커를 사용해 적절한 위치에 배치해주세요.`);

  if (input.visionDescriptions && input.visionDescriptions.length > 0) {
    const descriptions = input.visionDescriptions
      .map((desc, i) => `- 이미지 ${i + 1}: ${desc}`)
      .join("\n");
    parts.push(`## 이미지 분석 결과\n${descriptions}`);
  }

  if (input.requiredPhrases) {
    parts.push(`## 필수 포함 문구\n다음 문구를 글에 자연스럽게 녹여서 반드시 포함해주세요:\n"${input.requiredPhrases}"`);
  }

  parts.push(`위 정보를 바탕으로 네이버 블로그 맛집 리뷰를 작성해주세요.`);

  return {
    systemPrompt,
    userPrompt: parts.join("\n\n"),
  };
}
