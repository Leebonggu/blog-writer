import type { TonePresetId } from "./types";
import type { StoreInfo } from "@/features/scraper/types";
import type { CategoryId } from "./templates";
import { getTonePreset } from "./tone-presets";
import { buildCategorySystemPrompt } from "./templates";

interface PromptInput {
  category: CategoryId;
  storeName: string;
  storeInfo: StoreInfo;
  tonePresetId: TonePresetId | "custom";
  customToneInstruction?: string;
  sponsorType: "self-paid" | "sponsored";
  sponsorName?: string;
  imageCount: number;
  requiredPhrases?: string;
  personalNote?: string;
  revisitIntent: "definitely" | "maybe" | "no";
  includeHonestReview?: boolean;
  visionDescriptions?: string[];
}

interface PromptOutput {
  systemPrompt: string;
  userPrompt: string;
}

function buildImageGuide(count: number): string {
  if (count === 0) return "## 이미지\n이미지가 없습니다. 이미지 마커를 사용하지 마세요.";

  const intro = 1;
  const atmosphere = Math.min(2, Math.max(1, Math.round(count * 0.15)));
  const closing = 0;
  const info = 0;
  const menu = count - intro - atmosphere - closing - info;

  const lines = [
    `## 이미지 배치 계획`,
    `총 ${count}장의 이미지가 업로드되었습니다. [IMAGE_1]~[IMAGE_${count}] 마커를 모두 사용하세요.`,
    ``,
    `### 섹션별 배분`,
    `- 인트로: ${intro}장 (대표 사진)`,
    `- 가게/주문 정보: ${info}장 (텍스트만)`,
    `- 분위기/포장: ${atmosphere}장`,
    `- 메뉴/상품 리뷰: ${menu}장 (가장 많이 배치)`,
    `- 총평/마무리: ${closing}장 (텍스트로 마무리)`,
    ``,
    `### 배치 리듬`,
    `- 이미지 1장 → 텍스트 2~3줄 → 이미지 1장 교차 반복`,
    `- 이미지 2장 연속까지는 허용, 3장 이상 연속 금지`,
    `- 텍스트 5줄 이상 이미지 없이 이어지지 않도록`,
    `- 메뉴/상품 리뷰: 이미지 먼저 → 설명 순서`,
  ];

  return lines.join("\n");
}

export function buildPrompt(input: PromptInput): PromptOutput {
  let toneInstruction: string;
  if (input.tonePresetId === "custom" && input.customToneInstruction) {
    toneInstruction = `다음 문체 스타일을 따라 작성해주세요:\n${input.customToneInstruction}`;
  } else {
    const preset = getTonePreset(input.tonePresetId as TonePresetId);
    toneInstruction = preset?.promptInstruction ?? "";
  }

  const categoryPrompt = buildCategorySystemPrompt(input.category);
  const systemPrompt = `${categoryPrompt}\n\n## 문체\n${toneInstruction}`;

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
    parts.push(`## 협찬 정보\n협찬 업체: ${input.sponsorName ?? "업체명 미입력"}\n글 첫 줄에 협찬임을 자연스럽게 밝혀주세요.`);
  }

  parts.push(buildImageGuide(input.imageCount));

  if (input.visionDescriptions && input.visionDescriptions.length > 0) {
    const descriptions = input.visionDescriptions
      .map((desc, i) => `- 이미지 ${i + 1}: ${desc}`)
      .join("\n");
    parts.push(`## 이미지 분석 결과\n${descriptions}`);
  }

  const revisitMap = {
    definitely: "꼭 재방문할 의사 있음 (강력 추천)",
    maybe: "기회가 되면 다시 방문할 수 있음 (괜찮았음)",
    no: "재방문 의사 없음 (아쉬웠음)",
  };
  parts.push(`## 재방문 의사\n${revisitMap[input.revisitIntent]}\n총평에 이 재방문 의사를 자연스럽게 반영해주세요.`);

  if (input.includeHonestReview) {
    parts.push(`## 솔직 리뷰 모드
아쉬운 점이나 단점도 자연스럽게 1~2개 포함해주세요.
예: 주차가 불편하다, 웨이팅이 길다, 양이 아쉽다, 가격이 조금 있다 등
단점을 억지로 만들지 말고, 해당 업종에서 흔히 있을 수 있는 현실적인 아쉬운 점을 넣어주세요.
이렇게 하면 글이 더 솔직하고 신뢰감 있게 느껴집니다.`);
  }

  if (input.personalNote) {
    parts.push(`## 작성자의 개인 감상/메모\n아래 내용은 작성자가 직접 느낀 점입니다. 글에 자연스럽게 녹여서 반영해주세요. 그대로 복사하지 말고, 톤에 맞게 재구성하세요.\n"${input.personalNote}"`);
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
