import type { LLMModel } from "@/features/llm/types";
import type { StoreInfo } from "@/features/scraper/types";
import type { CategoryId } from "./templates";

export type TonePresetId = "friendly" | "informative" | "emotional";

export type SponsorType = "self-paid" | "sponsored";

export type RevisitIntent = "definitely" | "maybe" | "no";

export interface TonePreset {
  id: TonePresetId;
  name: string;
  description: string;
  promptInstruction: string;
}

export interface BlogInput {
  category: CategoryId;
  storeName: string;
  naverMapUrl: string;
  sponsorType: SponsorType;
  sponsorName?: string;
  images: string[]; // base64 data URLs
  tonePresetId: TonePresetId | "custom";
  referenceText?: string;
  requiredPhrases?: string;
  revisitIntent: RevisitIntent;
  personalNote?: string;
  useVision: boolean;
  model: LLMModel;
}

export interface BlogOutput {
  title: string;
  html: string;
  plainText: string;
  imageGuide: ImagePlacement[];
}

export interface ImagePlacement {
  imageIndex: number;
  position: string;
  description: string;
}
