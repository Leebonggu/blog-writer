import type { TonePreset, TonePresetId } from "./types";

export const TONE_PRESETS: TonePreset[] = [
  {
    id: "friendly",
    name: "친근체",
    description: "일상적이고 친근한 말투",
    promptInstruction: `다음 문체 규칙을 따라 작성해주세요:
- "~했어요", "~인데요", "~거든요" 등 친근한 종결어미 사용
- 감탄사 자연스럽게 활용 ("와", "대박", "진짜")
- 독자에게 말을 거는 느낌 ("여러분", "한번 가보세요")
- 개인적인 감상과 경험 위주로 서술`,
  },
  {
    id: "informative",
    name: "정보전달형",
    description: "깔끔하고 객관적인 정보 중심",
    promptInstruction: `다음 문체 규칙을 따라 작성해주세요:
- 간결하고 명확한 문장 사용
- 가격, 영업시간 등 팩트 중심 서술
- 불필요한 감탄사나 이모티콘 자제
- "~입니다", "~합니다" 등 정중한 종결어미 사용
- 항목별로 정리된 구조`,
  },
  {
    id: "emotional",
    name: "감성체",
    description: "분위기와 감정을 풍부하게 표현",
    promptInstruction: `다음 문체 규칙을 따라 작성해주세요:
- 형용사와 비유를 풍부하게 사용
- 오감(시각, 미각, 후각, 촉각, 청각)을 활용한 묘사
- 분위기와 공간감 표현에 집중
- 서정적이고 문학적인 톤
- "~했다", "~이었다" 등 과거형 서술체도 활용 가능`,
  },
];

export function getTonePreset(id: TonePresetId): TonePreset | undefined {
  return TONE_PRESETS.find((preset) => preset.id === id);
}
