# Naver Blog Writer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page web app that generates Naver blog-style restaurant review posts using LLM, with image vision analysis and Naver Map scraping.

**Architecture:** Next.js App Router with 3-layer separation: `app/` (routes/API), `features/` (framework-agnostic business logic), `components/` (UI). LLM providers abstracted behind an interface. No database — all state is client-side.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, OpenAI SDK, Anthropic SDK, Cheerio, Vitest

---

## File Map

```
naver-blog-writer/
├── app/
│   ├── layout.tsx                        # Root layout with metadata
│   ├── page.tsx                          # Single page: form + result
│   ├── globals.css                       # Tailwind imports + custom styles
│   └── api/
│       ├── scrape/route.ts               # POST /api/scrape — Naver Map scraping
│       └── generate/route.ts             # POST /api/generate — Blog generation
│
├── features/
│   ├── llm/
│   │   ├── types.ts                      # LLMProvider interface, LLMModel enum
│   │   ├── provider-factory.ts           # createProvider(model) factory
│   │   ├── claude-provider.ts            # Anthropic SDK implementation
│   │   └── openai-provider.ts            # OpenAI SDK implementation
│   │
│   ├── scraper/
│   │   ├── types.ts                      # StoreInfo type
│   │   ├── naver-map-scraper.ts          # Extract place ID, call Naver internal API
│   │   └── parser.ts                     # Raw JSON → StoreInfo
│   │
│   └── blog/
│       ├── types.ts                      # BlogInput, BlogOutput, TonePreset, SponsorType
│       ├── tone-presets.ts               # 3 tone preset definitions
│       ├── templates/
│       │   └── restaurant.ts             # Restaurant system prompt template
│       ├── prompt-builder.ts             # Assemble full prompt from parts
│       └── blog-generator.ts             # Orchestrator: scrape → analyze tone → generate
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx                    # Reusable button
│   │   ├── Select.tsx                    # Reusable select dropdown
│   │   └── CopyButton.tsx               # Copy to clipboard with feedback
│   ├── blog-form/
│   │   └── BlogForm.tsx                  # Full input form
│   ├── image-uploader/
│   │   └── ImageUploader.tsx             # Drag & drop, base64 conversion, preview
│   └── blog-preview/
│       └── BlogPreview.tsx               # HTML preview + copy buttons
│
├── __tests__/
│   ├── features/
│   │   ├── llm/
│   │   │   ├── claude-provider.test.ts
│   │   │   ├── openai-provider.test.ts
│   │   │   └── provider-factory.test.ts
│   │   ├── scraper/
│   │   │   ├── naver-map-scraper.test.ts
│   │   │   └── parser.test.ts
│   │   └── blog/
│   │       ├── tone-presets.test.ts
│   │       ├── prompt-builder.test.ts
│   │       └── blog-generator.test.ts
│   └── api/
│       ├── scrape.test.ts
│       └── generate.test.ts
│
├── .env.local                            # OPENAI_API_KEY, ANTHROPIC_API_KEY
├── .env.example                          # Template for .env.local
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
└── vitest.config.ts
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.env.example`, `.env.local`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/leebonggu/Desktop/playground
npx create-next-app@latest naver-blog-writer --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

Accept defaults. This creates the base Next.js + Tailwind + TypeScript setup.

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/leebonggu/Desktop/playground/naver-blog-writer
npm install openai @anthropic-ai/sdk cheerio
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 4: Add test script to package.json**

Add to `scripts` section:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Create .env.example**

```bash
# .env.example
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

- [ ] **Step 6: Create .env.local with real keys**

```bash
# .env.local
OPENAI_API_KEY=<your-key>
ANTHROPIC_API_KEY=<your-key>
```

- [ ] **Step 7: Add .env.local to .gitignore**

Verify `.env.local` is already in `.gitignore` (create-next-app includes it by default). If not, add it.

- [ ] **Step 8: Verify setup**

```bash
cd /Users/leebonggu/Desktop/playground/naver-blog-writer
npm run build
npm run test
```

Expected: Build succeeds. Test runner starts with 0 tests.

- [ ] **Step 9: Initialize git and commit**

```bash
cd /Users/leebonggu/Desktop/playground/naver-blog-writer
git init
git add -A
git commit -m "chore: scaffold Next.js project with Tailwind, Vitest, LLM SDKs"
```

---

### Task 2: LLM Provider Layer

**Files:**
- Create: `features/llm/types.ts`, `features/llm/claude-provider.ts`, `features/llm/openai-provider.ts`, `features/llm/provider-factory.ts`
- Test: `__tests__/features/llm/claude-provider.test.ts`, `__tests__/features/llm/openai-provider.test.ts`, `__tests__/features/llm/provider-factory.test.ts`

- [ ] **Step 1: Write types**

```typescript
// features/llm/types.ts
export type LLMModel = "claude-sonnet" | "gpt-4o";

export interface LLMProvider {
  generateText(prompt: string, systemPrompt?: string, images?: string[]): Promise<string>;
}
```

- [ ] **Step 2: Write failing test for Claude provider**

```typescript
// __tests__/features/llm/claude-provider.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClaudeProvider } from "@/features/llm/claude-provider";

vi.mock("@anthropic-ai/sdk", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "Generated blog post" }],
  });
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  };
});

describe("ClaudeProvider", () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    provider = new ClaudeProvider("test-api-key");
  });

  it("generates text without images", async () => {
    const result = await provider.generateText("Write a review", "You are a blogger");
    expect(result).toBe("Generated blog post");
  });

  it("generates text with images as base64", async () => {
    const fakeBase64 = "data:image/jpeg;base64,/9j/4AAQ...";
    const result = await provider.generateText("Describe this food", "You are a blogger", [fakeBase64]);
    expect(result).toBe("Generated blog post");
  });
});
```

- [ ] **Step 3: Run test — verify it fails**

```bash
cd /Users/leebonggu/Desktop/playground/naver-blog-writer
npx vitest run __tests__/features/llm/claude-provider.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement Claude provider**

```typescript
// features/llm/claude-provider.ts
import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider } from "./types";

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateText(prompt: string, systemPrompt?: string, images?: string[]): Promise<string> {
    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    if (images && images.length > 0) {
      for (const img of images) {
        const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
        const mediaType = img.match(/^data:(image\/\w+);base64,/)?.[1] ?? "image/jpeg";
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: base64Data,
          },
        });
      }
    }

    content.push({ type: "text", text: prompt });

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt ?? "",
      messages: [{ role: "user", content }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock ? textBlock.text : "";
  }
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
npx vitest run __tests__/features/llm/claude-provider.test.ts
```

Expected: PASS

- [ ] **Step 6: Write failing test for OpenAI provider**

```typescript
// __tests__/features/llm/openai-provider.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenAIProvider } from "@/features/llm/openai-provider";

vi.mock("openai", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Generated blog post" } }],
  });
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    })),
  };
});

describe("OpenAIProvider", () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider("test-api-key");
  });

  it("generates text without images", async () => {
    const result = await provider.generateText("Write a review", "You are a blogger");
    expect(result).toBe("Generated blog post");
  });

  it("generates text with images", async () => {
    const fakeBase64 = "data:image/jpeg;base64,/9j/4AAQ...";
    const result = await provider.generateText("Describe this food", "You are a blogger", [fakeBase64]);
    expect(result).toBe("Generated blog post");
  });
});
```

- [ ] **Step 7: Run test — verify it fails**

```bash
npx vitest run __tests__/features/llm/openai-provider.test.ts
```

Expected: FAIL

- [ ] **Step 8: Implement OpenAI provider**

```typescript
// features/llm/openai-provider.ts
import OpenAI from "openai";
import type { LLMProvider } from "./types";

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateText(prompt: string, systemPrompt?: string, images?: string[]): Promise<string> {
    const userContent: OpenAI.ChatCompletionContentPart[] = [];

    if (images && images.length > 0) {
      for (const img of images) {
        userContent.push({
          type: "image_url",
          image_url: { url: img, detail: "low" },
        });
      }
    }

    userContent.push({ type: "text", text: prompt });

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userContent });

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      messages,
    });

    return response.choices[0]?.message?.content ?? "";
  }
}
```

- [ ] **Step 9: Run test — verify it passes**

```bash
npx vitest run __tests__/features/llm/openai-provider.test.ts
```

Expected: PASS

- [ ] **Step 10: Write failing test for provider factory**

```typescript
// __tests__/features/llm/provider-factory.test.ts
import { describe, it, expect } from "vitest";
import { createProvider } from "@/features/llm/provider-factory";
import { ClaudeProvider } from "@/features/llm/claude-provider";
import { OpenAIProvider } from "@/features/llm/openai-provider";

describe("createProvider", () => {
  it("creates ClaudeProvider for claude-sonnet", () => {
    const provider = createProvider("claude-sonnet", { anthropicApiKey: "test" });
    expect(provider).toBeInstanceOf(ClaudeProvider);
  });

  it("creates OpenAIProvider for gpt-4o", () => {
    const provider = createProvider("gpt-4o", { openaiApiKey: "test" });
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it("throws for unknown model", () => {
    expect(() => createProvider("unknown" as any, {})).toThrow();
  });
});
```

- [ ] **Step 11: Run test — verify it fails**

```bash
npx vitest run __tests__/features/llm/provider-factory.test.ts
```

Expected: FAIL

- [ ] **Step 12: Implement provider factory**

```typescript
// features/llm/provider-factory.ts
import type { LLMModel, LLMProvider } from "./types";
import { ClaudeProvider } from "./claude-provider";
import { OpenAIProvider } from "./openai-provider";

interface ApiKeys {
  anthropicApiKey?: string;
  openaiApiKey?: string;
}

export function createProvider(model: LLMModel, keys: ApiKeys): LLMProvider {
  switch (model) {
    case "claude-sonnet":
      if (!keys.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY is required");
      return new ClaudeProvider(keys.anthropicApiKey);
    case "gpt-4o":
      if (!keys.openaiApiKey) throw new Error("OPENAI_API_KEY is required");
      return new OpenAIProvider(keys.openaiApiKey);
    default:
      throw new Error(`Unknown model: ${model}`);
  }
}
```

- [ ] **Step 13: Run all LLM tests — verify pass**

```bash
npx vitest run __tests__/features/llm/
```

Expected: All PASS

- [ ] **Step 14: Commit**

```bash
git add features/llm/ __tests__/features/llm/
git commit -m "feat: add LLM provider layer with Claude and OpenAI support"
```

---

### Task 3: Naver Map Scraper

**Files:**
- Create: `features/scraper/types.ts`, `features/scraper/parser.ts`, `features/scraper/naver-map-scraper.ts`
- Test: `__tests__/features/scraper/parser.test.ts`, `__tests__/features/scraper/naver-map-scraper.test.ts`

- [ ] **Step 1: Write scraper types**

```typescript
// features/scraper/types.ts
export interface StoreInfo {
  address: string;
  businessHours: string;
  menus: { name: string; price: string }[];
  category: string;
  phone: string;
}

export interface StoreInfoScraper {
  scrape(url: string): Promise<StoreInfo>;
}
```

- [ ] **Step 2: Write failing test for parser**

```typescript
// __tests__/features/scraper/parser.test.ts
import { describe, it, expect } from "vitest";
import { parseNaverPlaceData } from "@/features/scraper/parser";

describe("parseNaverPlaceData", () => {
  it("parses full place data", () => {
    const raw = {
      basicInfo: {
        address: "서울시 강남구 역삼동 123-4",
        businessHours: {
          status: { text: "영업중" },
          regularHours: [{ day: "매일", time: "11:00 - 22:00" }],
        },
        category: "한식",
        phone: "02-1234-5678",
      },
      menus: [
        { name: "후라이드치킨", price: "18000" },
        { name: "양념치킨", price: "19000" },
      ],
    };

    const result = parseNaverPlaceData(raw);

    expect(result).toEqual({
      address: "서울시 강남구 역삼동 123-4",
      businessHours: "매일 11:00 - 22:00",
      menus: [
        { name: "후라이드치킨", price: "18,000원" },
        { name: "양념치킨", price: "19,000원" },
      ],
      category: "한식",
      phone: "02-1234-5678",
    });
  });

  it("handles missing optional fields", () => {
    const raw = {
      basicInfo: {
        address: "서울시 강남구",
        category: "양식",
      },
    };

    const result = parseNaverPlaceData(raw);

    expect(result).toEqual({
      address: "서울시 강남구",
      businessHours: "",
      menus: [],
      category: "양식",
      phone: "",
    });
  });
});
```

- [ ] **Step 3: Run test — verify it fails**

```bash
npx vitest run __tests__/features/scraper/parser.test.ts
```

Expected: FAIL

- [ ] **Step 4: Implement parser**

```typescript
// features/scraper/parser.ts
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
```

- [ ] **Step 5: Run test — verify it passes**

```bash
npx vitest run __tests__/features/scraper/parser.test.ts
```

Expected: PASS

- [ ] **Step 6: Write failing test for naver-map-scraper**

```typescript
// __tests__/features/scraper/naver-map-scraper.test.ts
import { describe, it, expect, vi } from "vitest";
import { NaverMapScraper, extractPlaceId } from "@/features/scraper/naver-map-scraper";

describe("extractPlaceId", () => {
  it("extracts place ID from standard URL", () => {
    expect(extractPlaceId("https://map.naver.com/v5/entry/place/1234567")).toBe("1234567");
  });

  it("extracts place ID from search result URL", () => {
    expect(extractPlaceId("https://map.naver.com/v5/search/치킨/place/1234567")).toBe("1234567");
  });

  it("extracts place ID from naver.me short URL place pattern", () => {
    expect(extractPlaceId("https://naver.me/xAbCdEf")).toBe(null);
  });

  it("returns null for invalid URL", () => {
    expect(extractPlaceId("https://google.com")).toBe(null);
  });
});

describe("NaverMapScraper", () => {
  it("scrapes store info from place ID", async () => {
    const mockResponse = {
      basicInfo: {
        address: "서울시 강남구",
        category: "한식",
        phone: "02-1234-5678",
      },
      menus: [{ name: "치킨", price: "18000" }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const scraper = new NaverMapScraper();
    const result = await scraper.scrape("https://map.naver.com/v5/entry/place/1234567");

    expect(result.address).toBe("서울시 강남구");
    expect(result.category).toBe("한식");
    expect(result.menus).toHaveLength(1);
  });

  it("throws on invalid URL", async () => {
    const scraper = new NaverMapScraper();
    await expect(scraper.scrape("https://google.com")).rejects.toThrow("유효하지 않은 네이버 지도 URL입니다");
  });
});
```

- [ ] **Step 7: Run test — verify it fails**

```bash
npx vitest run __tests__/features/scraper/naver-map-scraper.test.ts
```

Expected: FAIL

- [ ] **Step 8: Implement naver-map-scraper**

```typescript
// features/scraper/naver-map-scraper.ts
import type { StoreInfo, StoreInfoScraper } from "./types";
import { parseNaverPlaceData } from "./parser";

export function extractPlaceId(url: string): string | null {
  const patterns = [
    /place\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export class NaverMapScraper implements StoreInfoScraper {
  async scrape(url: string): Promise<StoreInfo> {
    const placeId = extractPlaceId(url);
    if (!placeId) {
      throw new Error("유효하지 않은 네이버 지도 URL입니다");
    }

    const apiUrl = `https://map.naver.com/p/api/search/allSearch?query=${placeId}&type=place`;
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://map.naver.com/",
      },
    });

    if (!response.ok) {
      throw new Error(`크롤링 실패: ${response.status}`);
    }

    const data = await response.json();
    return parseNaverPlaceData(data);
  }
}
```

> **Note to implementer:** The exact Naver internal API endpoint and response structure may differ from what's shown here. During implementation, open a real Naver Map place page in browser DevTools, observe the network requests, and adjust `apiUrl` and `parseNaverPlaceData` accordingly. The interface and test structure remain the same — only the URL and field paths may change.

- [ ] **Step 9: Run test — verify it passes**

```bash
npx vitest run __tests__/features/scraper/
```

Expected: All PASS

- [ ] **Step 10: Commit**

```bash
git add features/scraper/ __tests__/features/scraper/
git commit -m "feat: add Naver Map scraper with place ID extraction and parsing"
```

---

### Task 4: Blog Generation Core (Types, Tone Presets, Prompt Builder)

**Files:**
- Create: `features/blog/types.ts`, `features/blog/tone-presets.ts`, `features/blog/templates/restaurant.ts`, `features/blog/prompt-builder.ts`
- Test: `__tests__/features/blog/tone-presets.test.ts`, `__tests__/features/blog/prompt-builder.test.ts`

- [ ] **Step 1: Write blog types**

```typescript
// features/blog/types.ts
import type { LLMModel } from "@/features/llm/types";
import type { StoreInfo } from "@/features/scraper/types";

export type TonePresetId = "friendly" | "informative" | "emotional";

export type SponsorType = "self-paid" | "sponsored";

export interface TonePreset {
  id: TonePresetId;
  name: string;
  description: string;
  promptInstruction: string;
}

export interface BlogInput {
  storeName: string;
  naverMapUrl: string;
  sponsorType: SponsorType;
  sponsorName?: string;
  images: string[]; // base64 data URLs
  tonePresetId: TonePresetId | "custom";
  referenceText?: string;
  requiredPhrases?: string;
  useVision: boolean;
  model: LLMModel;
}

export interface BlogOutput {
  html: string;
  plainText: string;
  imageGuide: ImagePlacement[];
}

export interface ImagePlacement {
  imageIndex: number;
  position: string; // e.g. "인트로 이후", "메뉴 소개 섹션"
  description: string; // e.g. "외관 사진", "메뉴 클로즈업"
}
```

- [ ] **Step 2: Write failing test for tone presets**

```typescript
// __tests__/features/blog/tone-presets.test.ts
import { describe, it, expect } from "vitest";
import { TONE_PRESETS, getTonePreset } from "@/features/blog/tone-presets";

describe("TONE_PRESETS", () => {
  it("has 3 presets", () => {
    expect(TONE_PRESETS).toHaveLength(3);
  });

  it("each preset has required fields", () => {
    for (const preset of TONE_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.promptInstruction).toBeTruthy();
    }
  });
});

describe("getTonePreset", () => {
  it("returns preset by id", () => {
    const preset = getTonePreset("friendly");
    expect(preset?.name).toBe("친근체");
  });

  it("returns undefined for unknown id", () => {
    expect(getTonePreset("unknown" as any)).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test — verify it fails**

```bash
npx vitest run __tests__/features/blog/tone-presets.test.ts
```

Expected: FAIL

- [ ] **Step 4: Implement tone presets**

```typescript
// features/blog/tone-presets.ts
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
```

- [ ] **Step 5: Run test — verify it passes**

```bash
npx vitest run __tests__/features/blog/tone-presets.test.ts
```

Expected: PASS

- [ ] **Step 6: Write restaurant template**

```typescript
// features/blog/templates/restaurant.ts
export const RESTAURANT_SYSTEM_PROMPT = `당신은 네이버 블로그 맛집 리뷰 전문 작성자입니다.

## 규칙
- 1500자 내외로 작성 (1300~1700자)
- HTML 형식으로 출력 (네이버 블로그 에디터에 붙여넣기 가능하도록)
- <p> 태그로 문단 구분
- <strong> 태그로 강조
- <br> 태그로 줄바꿈

## 글 구조
1. 인트로 (방문 계기, 첫인상, 분위기) — 이미지 마커 [IMAGE_1], [IMAGE_2]
2. 메뉴 소개 & 맛 묘사 — 이미지 마커 [IMAGE_3]~[IMAGE_5]
3. 상세 리뷰 (특징, 서비스, 분위기 등) — 이미지 마커 [IMAGE_6]~[IMAGE_8]
4. 마무리 (총평, 추천 여부) — 이미지 마커 [IMAGE_9], [IMAGE_10]
5. 가게 정보 (주소, 영업시간, 전화번호, 네이버 지도 링크)

## 이미지 마커 규칙
- [IMAGE_N] 형식으로 이미지 위치를 표시 (N은 1부터 시작)
- 이미지 마커는 반드시 별도 줄에 배치
- 실제 업로드된 이미지 수에 맞춰 마커 수를 조절
- 각 마커 뒤에 간단한 설명 추가: [IMAGE_1] <!-- 외관 사진 -->

## 내돈내산/협찬 규칙
- 내돈내산: 글 상단에 "본 포스팅은 직접 방문하여 작성한 솔직한 후기입니다." 포함
- 협찬: 글 상단에 "본 포스팅은 [업체명]으로부터 제공받아 작성한 솔직한 후기입니다." 포함

## 중요
- 필수 포함 문구가 주어지면 글에 자연스럽게 녹여서 포함
- 과장하지 않고 자연스러운 리뷰 느낌 유지
- 네이버 블로그 SEO를 고려하여 상호명, 메뉴명을 자연스럽게 반복`;
```

- [ ] **Step 7: Write failing test for prompt-builder**

```typescript
// __tests__/features/blog/prompt-builder.test.ts
import { describe, it, expect } from "vitest";
import { buildPrompt } from "@/features/blog/prompt-builder";
import type { StoreInfo } from "@/features/scraper/types";

const mockStoreInfo: StoreInfo = {
  address: "서울시 강남구 역삼동 123-4",
  businessHours: "매일 11:00 - 22:00",
  menus: [
    { name: "후라이드치킨", price: "18,000원" },
    { name: "양념치킨", price: "19,000원" },
  ],
  category: "한식",
  phone: "02-1234-5678",
};

describe("buildPrompt", () => {
  it("builds prompt with store info and tone", () => {
    const result = buildPrompt({
      storeName: "맛있는 치킨집",
      storeInfo: mockStoreInfo,
      tonePresetId: "friendly",
      sponsorType: "self-paid",
      imageCount: 5,
    });

    expect(result.systemPrompt).toContain("네이버 블로그 맛집 리뷰");
    expect(result.systemPrompt).toContain("친근");
    expect(result.userPrompt).toContain("맛있는 치킨집");
    expect(result.userPrompt).toContain("서울시 강남구");
    expect(result.userPrompt).toContain("후라이드치킨");
    expect(result.userPrompt).toContain("이미지 5장");
  });

  it("includes sponsor info for sponsored posts", () => {
    const result = buildPrompt({
      storeName: "맛있는 치킨집",
      storeInfo: mockStoreInfo,
      tonePresetId: "informative",
      sponsorType: "sponsored",
      sponsorName: "OO치킨 본사",
      imageCount: 3,
    });

    expect(result.userPrompt).toContain("협찬");
    expect(result.userPrompt).toContain("OO치킨 본사");
  });

  it("includes required phrases", () => {
    const result = buildPrompt({
      storeName: "맛있는 치킨집",
      storeInfo: mockStoreInfo,
      tonePresetId: "friendly",
      sponsorType: "self-paid",
      imageCount: 3,
      requiredPhrases: "바삭바삭한 치킨",
    });

    expect(result.userPrompt).toContain("바삭바삭한 치킨");
  });

  it("includes custom tone from reference analysis", () => {
    const result = buildPrompt({
      storeName: "맛있는 치킨집",
      storeInfo: mockStoreInfo,
      tonePresetId: "custom",
      customToneInstruction: "짧은 문장, ~했다 체, 감성적",
      sponsorType: "self-paid",
      imageCount: 3,
    });

    expect(result.systemPrompt).toContain("짧은 문장");
  });

  it("includes vision analysis results when provided", () => {
    const result = buildPrompt({
      storeName: "맛있는 치킨집",
      storeInfo: mockStoreInfo,
      tonePresetId: "friendly",
      sponsorType: "self-paid",
      imageCount: 3,
      visionDescriptions: ["바삭한 후라이드치킨 클로즈업", "아늑한 내부 인테리어"],
    });

    expect(result.userPrompt).toContain("바삭한 후라이드치킨 클로즈업");
  });
});
```

- [ ] **Step 8: Run test — verify it fails**

```bash
npx vitest run __tests__/features/blog/prompt-builder.test.ts
```

Expected: FAIL

- [ ] **Step 9: Implement prompt-builder**

```typescript
// features/blog/prompt-builder.ts
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
  // System prompt: base template + tone
  let toneInstruction: string;
  if (input.tonePresetId === "custom" && input.customToneInstruction) {
    toneInstruction = `다음 문체 스타일을 따라 작성해주세요:\n${input.customToneInstruction}`;
  } else {
    const preset = getTonePreset(input.tonePresetId as TonePresetId);
    toneInstruction = preset?.promptInstruction ?? "";
  }

  const systemPrompt = `${RESTAURANT_SYSTEM_PROMPT}\n\n## 문체\n${toneInstruction}`;

  // User prompt: context
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
```

- [ ] **Step 10: Run test — verify it passes**

```bash
npx vitest run __tests__/features/blog/
```

Expected: All PASS

- [ ] **Step 11: Commit**

```bash
git add features/blog/ __tests__/features/blog/
git commit -m "feat: add blog types, tone presets, restaurant template, and prompt builder"
```

---

### Task 5: Blog Generator Orchestrator

**Files:**
- Create: `features/blog/blog-generator.ts`
- Test: `__tests__/features/blog/blog-generator.test.ts`

- [ ] **Step 1: Write failing test for blog-generator**

```typescript
// __tests__/features/blog/blog-generator.test.ts
import { describe, it, expect, vi } from "vitest";
import { generateBlogPost } from "@/features/blog/blog-generator";
import type { BlogInput } from "@/features/blog/types";
import type { StoreInfo } from "@/features/scraper/types";
import type { LLMProvider } from "@/features/llm/types";

describe("generateBlogPost", () => {
  const mockStoreInfo: StoreInfo = {
    address: "서울시 강남구",
    businessHours: "매일 11:00 - 22:00",
    menus: [{ name: "치킨", price: "18,000원" }],
    category: "한식",
    phone: "02-1234-5678",
  };

  const mockProvider: LLMProvider = {
    generateText: vi.fn()
      .mockResolvedValueOnce(
        // First call: vision analysis (if useVision is true)
        "1. 바삭한 치킨 클로즈업\n2. 깔끔한 매장 내부"
      )
      .mockResolvedValueOnce(
        // Second call: blog generation
        '<p>오늘은 맛있는 치킨집을 방문했어요!</p>\n[IMAGE_1] <!-- 외관 -->\n<p>치킨이 정말 바삭해요.</p>\n[IMAGE_2] <!-- 치킨 -->'
      ),
  };

  const baseInput: BlogInput = {
    storeName: "맛있는 치킨집",
    naverMapUrl: "https://map.naver.com/v5/entry/place/123",
    sponsorType: "self-paid",
    images: ["data:image/jpeg;base64,abc", "data:image/jpeg;base64,def"],
    tonePresetId: "friendly",
    useVision: true,
    model: "claude-sonnet",
  };

  it("generates blog post with vision analysis", async () => {
    const result = await generateBlogPost(baseInput, mockStoreInfo, mockProvider);

    expect(result.html).toContain("치킨");
    expect(result.plainText).toBeTruthy();
    expect(result.imageGuide).toBeDefined();
    expect(mockProvider.generateText).toHaveBeenCalledTimes(2);
  });

  it("generates blog post without vision analysis", async () => {
    const noVisionProvider: LLMProvider = {
      generateText: vi.fn().mockResolvedValueOnce(
        '<p>오늘은 맛있는 치킨집!</p>\n[IMAGE_1] <!-- 외관 -->'
      ),
    };

    const result = await generateBlogPost(
      { ...baseInput, useVision: false },
      mockStoreInfo,
      noVisionProvider,
    );

    expect(result.html).toContain("치킨");
    expect(noVisionProvider.generateText).toHaveBeenCalledTimes(1);
  });

  it("handles reference text for custom tone", async () => {
    const customProvider: LLMProvider = {
      generateText: vi.fn()
        .mockResolvedValueOnce("짧은 문장체, 감성적, ~했다 종결") // tone analysis
        .mockResolvedValueOnce("이미지 분석 결과") // vision
        .mockResolvedValueOnce('<p>결과물</p>'), // generation
    };

    const result = await generateBlogPost(
      { ...baseInput, tonePresetId: "custom", referenceText: "참고할 블로그 글..." },
      mockStoreInfo,
      customProvider,
    );

    expect(result.html).toContain("결과물");
    expect(customProvider.generateText).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run __tests__/features/blog/blog-generator.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement blog-generator**

```typescript
// features/blog/blog-generator.ts
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
    storeName: input.storeName,
    storeInfo,
    tonePresetId: input.tonePresetId,
    customToneInstruction,
    sponsorType: input.sponsorType,
    sponsorName: input.sponsorName,
    imageCount: input.images.length,
    requiredPhrases: input.requiredPhrases,
    visionDescriptions,
  });

  const html = await provider.generateText(userPrompt, systemPrompt);

  return {
    html,
    plainText: htmlToPlainText(html),
    imageGuide: extractImageGuide(html),
  };
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run __tests__/features/blog/blog-generator.test.ts
```

Expected: All PASS

- [ ] **Step 5: Run all feature tests**

```bash
npx vitest run __tests__/features/
```

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add features/blog/blog-generator.ts __tests__/features/blog/blog-generator.test.ts
git commit -m "feat: add blog generator orchestrator with vision and tone analysis"
```

---

### Task 6: API Routes

**Files:**
- Create: `app/api/scrape/route.ts`, `app/api/generate/route.ts`
- Test: `__tests__/api/scrape.test.ts`, `__tests__/api/generate.test.ts`

- [ ] **Step 1: Write failing test for scrape API**

```typescript
// __tests__/api/scrape.test.ts
import { describe, it, expect, vi } from "vitest";

// Mock the scraper module
vi.mock("@/features/scraper/naver-map-scraper", () => ({
  NaverMapScraper: vi.fn().mockImplementation(() => ({
    scrape: vi.fn().mockResolvedValue({
      address: "서울시 강남구",
      businessHours: "매일 11:00 - 22:00",
      menus: [{ name: "치킨", price: "18,000원" }],
      category: "한식",
      phone: "02-1234-5678",
    }),
  })),
}));

// Import after mock
import { POST } from "@/app/api/scrape/route";

describe("POST /api/scrape", () => {
  it("returns store info for valid URL", async () => {
    const request = new Request("http://localhost/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://map.naver.com/v5/entry/place/123" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.address).toBe("서울시 강남구");
  });

  it("returns 400 for missing URL", async () => {
    const request = new Request("http://localhost/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run __tests__/api/scrape.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement scrape route**

```typescript
// app/api/scrape/route.ts
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
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run __tests__/api/scrape.test.ts
```

Expected: PASS

- [ ] **Step 5: Write failing test for generate API**

```typescript
// __tests__/api/generate.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/features/llm/provider-factory", () => ({
  createProvider: vi.fn().mockReturnValue({
    generateText: vi.fn().mockResolvedValue('<p>맛있는 치킨 리뷰입니다!</p>\n[IMAGE_1] <!-- 외관 -->'),
  }),
}));

import { POST } from "@/app/api/generate/route";

describe("POST /api/generate", () => {
  it("returns generated blog post", async () => {
    const request = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeName: "맛있는 치킨집",
        storeInfo: {
          address: "서울시 강남구",
          businessHours: "매일 11:00 - 22:00",
          menus: [{ name: "치킨", price: "18,000원" }],
          category: "한식",
          phone: "02-1234-5678",
        },
        sponsorType: "self-paid",
        images: [],
        tonePresetId: "friendly",
        useVision: false,
        model: "claude-sonnet",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.html).toContain("치킨");
    expect(data.plainText).toBeTruthy();
    expect(data.imageGuide).toBeDefined();
  });

  it("returns 400 for missing storeName", async () => {
    const request = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeInfo: {} }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 6: Run test — verify it fails**

```bash
npx vitest run __tests__/api/generate.test.ts
```

Expected: FAIL

- [ ] **Step 7: Implement generate route**

```typescript
// app/api/generate/route.ts
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
```

- [ ] **Step 8: Run test — verify it passes**

```bash
npx vitest run __tests__/api/
```

Expected: All PASS

- [ ] **Step 9: Commit**

```bash
git add app/api/ __tests__/api/
git commit -m "feat: add scrape and generate API routes"
```

---

### Task 7: UI Components — Common UI

**Files:**
- Create: `components/ui/Button.tsx`, `components/ui/Select.tsx`, `components/ui/CopyButton.tsx`

- [ ] **Step 1: Create Button component**

```tsx
// components/ui/Button.tsx
"use client";

import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  loading?: boolean;
}

export function Button({ variant = "primary", loading, children, className = "", disabled, ...props }: ButtonProps) {
  const base = "px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-green-600 text-white hover:bg-green-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? "처리 중..." : children}
    </button>
  );
}
```

- [ ] **Step 2: Create Select component**

```tsx
// components/ui/Select.tsx
"use client";

import { SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
}

export function Select({ label, options, className = "", ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select className={`border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${className}`} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 3: Create CopyButton component**

```tsx
// components/ui/CopyButton.tsx
"use client";

import { useState } from "react";
import { Button } from "./Button";

interface CopyButtonProps {
  text: string;
  label: string;
  richHtml?: string; // for rich text clipboard experiment
}

export function CopyButton({ text, label, richHtml }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (richHtml) {
        // Experiment: rich text clipboard with HTML + images
        const blob = new Blob([richHtml], { type: "text/html" });
        const plainBlob = new Blob([text], { type: "text/plain" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": blob,
            "text/plain": plainBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button variant="outline" onClick={handleCopy}>
      {copied ? "복사 완료!" : label}
    </Button>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/
git commit -m "feat: add common UI components (Button, Select, CopyButton)"
```

---

### Task 8: UI Components — ImageUploader

**Files:**
- Create: `components/image-uploader/ImageUploader.tsx`

- [ ] **Step 1: Create ImageUploader component**

```tsx
// components/image-uploader/ImageUploader.tsx
"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUploader({ images, onChange, maxImages = 20 }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remaining = maxImages - images.length;
    const filesToProcess = fileArray.slice(0, remaining);

    const promises = filesToProcess.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        }),
    );

    Promise.all(promises).then((newImages) => {
      onChange([...images, ...newImages]);
    });
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">
        이미지 ({images.length}/{maxImages})
      </label>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleChange}
        />
        <p className="text-gray-500 text-sm">
          이미지를 드래그하거나 클릭하여 업로드 (최대 {maxImages}장)
        </p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img
                src={img}
                alt={`이미지 ${i + 1}`}
                className="w-full h-20 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                X
              </button>
              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/image-uploader/
git commit -m "feat: add ImageUploader with drag & drop and base64 conversion"
```

---

### Task 9: UI Components — BlogPreview

**Files:**
- Create: `components/blog-preview/BlogPreview.tsx`

- [ ] **Step 1: Create BlogPreview component**

```tsx
// components/blog-preview/BlogPreview.tsx
"use client";

import type { BlogOutput } from "@/features/blog/types";
import { CopyButton } from "@/components/ui/CopyButton";

interface BlogPreviewProps {
  result: BlogOutput;
  images: string[];
}

export function BlogPreview({ result, images }: BlogPreviewProps) {
  // Replace [IMAGE_N] markers with actual images for preview
  const previewHtml = result.html.replace(
    /\[IMAGE_(\d+)\]\s*(?:<!--.*?-->)?/g,
    (_, num) => {
      const idx = parseInt(num, 10) - 1;
      if (idx >= 0 && idx < images.length) {
        return `<div style="margin:12px 0"><img src="${images[idx]}" style="max-width:100%;border-radius:8px" alt="이미지 ${num}" /></div>`;
      }
      return `<div style="margin:12px 0;padding:20px;background:#f3f4f6;border-radius:8px;text-align:center;color:#9ca3af">[이미지 ${num}]</div>`;
    },
  );

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-800">생성 결과</h2>

      {/* Preview */}
      <div
        className="border rounded-lg p-6 bg-white prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />

      {/* Image Guide */}
      {result.imageGuide.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-bold text-blue-800 mb-2">이미지 배치 가이드</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            {result.imageGuide.map((guide, i) => (
              <li key={i}>
                이미지 {guide.imageIndex}: {guide.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Copy buttons */}
      <div className="flex gap-2">
        <CopyButton text={result.plainText} label="텍스트 복사" />
        <CopyButton text={result.html} label="HTML 복사" />
        <CopyButton
          text={result.plainText}
          richHtml={previewHtml}
          label="리치텍스트 복사 (실험)"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/blog-preview/
git commit -m "feat: add BlogPreview with image preview and copy options"
```

---

### Task 10: UI Components — BlogForm + Page Assembly

**Files:**
- Create: `components/blog-form/BlogForm.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create BlogForm component**

```tsx
// components/blog-form/BlogForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ImageUploader } from "@/components/image-uploader/ImageUploader";
import { BlogPreview } from "@/components/blog-preview/BlogPreview";
import type { BlogOutput, SponsorType, TonePresetId } from "@/features/blog/types";
import type { LLMModel } from "@/features/llm/types";
import type { StoreInfo } from "@/features/scraper/types";

export function BlogForm() {
  // Form state
  const [storeName, setStoreName] = useState("");
  const [naverMapUrl, setNaverMapUrl] = useState("");
  const [sponsorType, setSponsorType] = useState<SponsorType>("self-paid");
  const [sponsorName, setSponsorName] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [tonePresetId, setTonePresetId] = useState<TonePresetId | "custom">("friendly");
  const [referenceText, setReferenceText] = useState("");
  const [requiredPhrases, setRequiredPhrases] = useState("");
  const [useVision, setUseVision] = useState(true);
  const [model, setModel] = useState<LLMModel>("claude-sonnet");

  // UI state
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [scrapeError, setScrapeError] = useState("");
  const [result, setResult] = useState<BlogOutput | null>(null);
  const [error, setError] = useState("");

  // Manual store info (fallback)
  const [manualAddress, setManualAddress] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualHours, setManualHours] = useState("");
  const [manualMenus, setManualMenus] = useState("");
  const [manualCategory, setManualCategory] = useState("");
  const [useManualInput, setUseManualInput] = useState(false);

  const handleScrape = async () => {
    if (!naverMapUrl) return;
    setScraping(true);
    setScrapeError("");

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: naverMapUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "크롤링 실패");
      }

      const data = await res.json();
      setStoreInfo(data);
      setUseManualInput(false);
    } catch (e) {
      setScrapeError(e instanceof Error ? e.message : "크롤링 실패");
      setUseManualInput(true);
    } finally {
      setScraping(false);
    }
  };

  const getEffectiveStoreInfo = (): StoreInfo => {
    if (storeInfo && !useManualInput) return storeInfo;
    return {
      address: manualAddress,
      businessHours: manualHours,
      menus: manualMenus
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [name, price] = line.split(",").map((s) => s.trim());
          return { name: name || "", price: price || "" };
        }),
      category: manualCategory,
      phone: manualPhone,
    };
  };

  const handleGenerate = async () => {
    if (!storeName) {
      setError("상호명을 입력해주세요.");
      return;
    }

    const effectiveStoreInfo = getEffectiveStoreInfo();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          storeInfo: effectiveStoreInfo,
          sponsorType,
          sponsorName: sponsorType === "sponsored" ? sponsorName : undefined,
          images,
          tonePresetId,
          referenceText: tonePresetId === "custom" ? referenceText : undefined,
          requiredPhrases: requiredPhrases || undefined,
          useVision,
          model,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "생성 실패");
      }

      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "글 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Basic Info */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-800">기본 정보</h2>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">상호명 *</label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="예: 맛있는 치킨집"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">네이버 지도 URL *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={naverMapUrl}
              onChange={(e) => setNaverMapUrl(e.target.value)}
              placeholder="https://map.naver.com/v5/entry/place/..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Button variant="secondary" onClick={handleScrape} loading={scraping}>
              정보 가져오기
            </Button>
          </div>
          {scrapeError && (
            <p className="text-sm text-red-500">{scrapeError} — 아래에서 직접 입력해주세요.</p>
          )}
          {storeInfo && !useManualInput && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <p>주소: {storeInfo.address}</p>
              <p>영업시간: {storeInfo.businessHours || "정보 없음"}</p>
              <p>카테고리: {storeInfo.category}</p>
              <p>메뉴: {storeInfo.menus.map((m) => m.name).join(", ") || "정보 없음"}</p>
              <button
                type="button"
                onClick={() => setUseManualInput(true)}
                className="text-green-600 underline mt-1"
              >
                직접 수정하기
              </button>
            </div>
          )}
        </div>

        {/* Manual Input Fallback */}
        {useManualInput && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-600">가게 정보 직접 입력</p>
            <input type="text" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} placeholder="주소" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input type="text" value={manualHours} onChange={(e) => setManualHours(e.target.value)} placeholder="영업시간 (예: 매일 11:00 - 22:00)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input type="text" value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} placeholder="카테고리 (예: 한식, 치킨)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input type="text" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="전화번호" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <textarea value={manualMenus} onChange={(e) => setManualMenus(e.target.value)} placeholder="메뉴 (줄바꿈으로 구분, 형식: 메뉴명, 가격)&#10;예: 후라이드치킨, 18000원" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        )}

        {/* Sponsor */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">내돈내산 / 협찬 *</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="sponsor" checked={sponsorType === "self-paid"} onChange={() => setSponsorType("self-paid")} />
              내돈내산
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="sponsor" checked={sponsorType === "sponsored"} onChange={() => setSponsorType("sponsored")} />
              협찬
            </label>
          </div>
          {sponsorType === "sponsored" && (
            <input
              type="text"
              value={sponsorName}
              onChange={(e) => setSponsorName(e.target.value)}
              placeholder="협찬 업체명"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm mt-2"
            />
          )}
        </div>
      </section>

      {/* Images */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-800">이미지</h2>
        <ImageUploader images={images} onChange={setImages} />
      </section>

      {/* Options */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-800">글 옵션</h2>

        <Select
          label="톤 선택"
          value={tonePresetId}
          onChange={(e) => setTonePresetId(e.target.value as TonePresetId | "custom")}
          options={[
            { value: "friendly", label: "친근체" },
            { value: "informative", label: "정보전달형" },
            { value: "emotional", label: "감성체" },
            { value: "custom", label: "레퍼런스 글 기반" },
          ]}
        />

        {tonePresetId === "custom" && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">레퍼런스 글</label>
            <textarea
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              placeholder="참고할 블로그 글의 URL 또는 텍스트를 입력하세요"
              rows={4}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">필수 포함 문구 (선택)</label>
          <textarea
            value={requiredPhrases}
            onChange={(e) => setRequiredPhrases(e.target.value)}
            placeholder="예: 바삭바삭한 치킨, 가성비 맛집"
            rows={2}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useVision} onChange={(e) => setUseVision(e.target.checked)} />
            이미지 비전 분석 (ON 시 이미지 기반 묘사 생성, 비용 증가)
          </label>
        </div>

        <Select
          label="LLM 선택"
          value={model}
          onChange={(e) => setModel(e.target.value as LLMModel)}
          options={[
            { value: "claude-sonnet", label: "Claude Sonnet (추천)" },
            { value: "gpt-4o", label: "GPT-4o" },
          ]}
        />
      </section>

      {/* Generate */}
      <div className="flex flex-col gap-2">
        <Button onClick={handleGenerate} loading={loading} className="w-full py-3 text-lg">
          글 생성하기
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Result */}
      {result && (
        <section className="space-y-4">
          <BlogPreview result={result} images={images} />
          <Button variant="secondary" onClick={handleGenerate} loading={loading}>
            다시 생성하기
          </Button>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update app/page.tsx**

```tsx
// app/page.tsx
import { BlogForm } from "@/components/blog-form/BlogForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          네이버 맛집 블로그 글 생성기
        </h1>
        <p className="text-gray-500 text-center mb-8">
          가게 정보와 이미지를 입력하면 네이버 블로그에 바로 붙여넣을 수 있는 맛집 리뷰를 생성합니다.
        </p>
        <BlogForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Update app/layout.tsx metadata**

Update the metadata in `app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  title: "네이버 맛집 블로그 글 생성기",
  description: "AI로 네이버 블로그 맛집 리뷰를 자동 생성합니다",
};
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/leebonggu/Desktop/playground/naver-blog-writer
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Manual smoke test**

```bash
npm run dev
```

Open `http://localhost:3000` in browser. Verify:
- Form renders with all fields
- Image drag & drop works
- Sponsor radio toggle shows/hides sponsor name field
- Tone select shows/hides reference text field

- [ ] **Step 6: Commit**

```bash
git add components/blog-form/ app/page.tsx app/layout.tsx
git commit -m "feat: add BlogForm and assemble main page"
```

---

### Task 11: Run All Tests and Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

```bash
cd /Users/leebonggu/Desktop/playground/naver-blog-writer
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Run dev server and end-to-end smoke test**

```bash
npm run dev
```

Test the full flow:
1. Enter store name
2. Enter Naver Map URL → click "정보 가져오기"
3. Upload 2-3 test images
4. Select tone, model
5. Click "글 생성하기"
6. Verify result preview renders
7. Test "텍스트 복사", "HTML 복사", "리치텍스트 복사 (실험)" buttons
8. Test "다시 생성하기"

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification — all tests pass, build succeeds"
```
