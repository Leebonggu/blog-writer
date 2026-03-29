# 네이버 맛집 블로그 글 생성기 — 설계 스펙

## 1. 개요

네이버 블로그 형식에 맞는 맛집 리뷰 포스팅을 자동 생성하는 웹 서비스.
개인 도구로 시작하되 SaaS로 확장 가능한 구조로 설계한다.

### 핵심 기능

- 가게 정보(상호명, 네이버 지도 URL) + 이미지 + 옵션 입력
- 네이버 지도 크롤링으로 상세 정보 자동 수집
- LLM을 활용한 1500자 내외 블로그 글 자동 생성
- 이미지 비전 분석으로 음식 묘사 자동 생성 (ON/OFF)
- 생성된 글 복사(텍스트/HTML)하여 네이버 블로그에 붙여넣기

### 비기능 요구사항

- DB 없이 동작 (모든 상태는 클라이언트 메모리)
- 유지보수 + 확장성 우선 (레이어 분리, 인터페이스 기반 설계)
- 멀티 LLM 지원 (OpenAI, Claude 등)

---

## 2. 사용자 플로우

**싱글 페이지 폼 → 생성 → 결과 복사**

### 입력 항목

| 항목 | 필수 | 설명 |
|------|------|------|
| 상호명 | O | 사용자 직접 입력 |
| 네이버 지도 URL | O | 크롤링으로 주소, 영업시간, 메뉴, 카테고리, 전화번호 추출 |
| 내돈내산/협찬 | O | 라디오 버튼. 협찬 시 협찬 업체명 입력 |
| 이미지 | O | 드래그 & 드롭 업로드, 최대 20장, base64 변환 |
| 톤 선택 | O | 프리셋 (친근체/정보전달형/감성체) 또는 레퍼런스 글 기반 |
| 레퍼런스 글 | X | 블로그 URL 또는 텍스트. 문체 분석 후 톤에 반영 |
| 필수 포함 문구 | X | 협찬사 요청 키워드 등. 글에 자연스럽게 녹임 |
| 이미지 비전 분석 | O | ON(기본)/OFF. OFF 시 비용 절감 |
| LLM 선택 | O | Claude Sonnet(기본) / GPT-4o 등 |

### 출력

- 네이버 블로그 스타일 미리보기
- 텍스트 복사 / HTML 복사 버튼
- 이미지 배치 가이드 (몇 번째 이미지를 어디에 삽입하라는 안내)
- 다시 생성 버튼

### 이미지 복사 전략

- **기본:** 텍스트 복붙 + 이미지 배치 가이드 (`[이미지 1: 외관 사진]` 마커)
- **실험:** 리치텍스트 클립보드 복사 (이미지 포함, `clipboard API` + `text/html` MIME)
  - 네이버 SmartEditor에서 동작 확인 후 결정
  - 동작하면 기본 복사 방식으로 승격
  - 안 되면 가이드 방식 유지, 실험 코드 제거

---

## 3. 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 풀스택, SSR, API Routes |
| 스타일링 | Tailwind CSS | 빠른 UI 개발 |
| LLM SDK | OpenAI SDK, Anthropic SDK | 공식 SDK 사용 |
| 크롤링 | Cheerio + fetch | 네이버 내부 place API 호출 방식. 가볍고 Vercel 호환 |
| 배포 | Vercel | 무료 티어로 시작 |

---

## 4. 아키텍처

### 디렉토리 구조

```
naver-blog-writer/
├── app/                          # Next.js 라우트 & UI
│   ├── page.tsx                  # 싱글 페이지 (폼 + 결과)
│   ├── layout.tsx
│   ├── api/
│   │   ├── generate/route.ts     # 글 생성 API
│   │   └── scrape/route.ts       # 네이버 지도 크롤링 API
│   └── globals.css
│
├── features/                     # 비즈니스 로직 (프레임워크 무관)
│   ├── blog/
│   │   ├── types.ts              # BlogInput, BlogOutput 등
│   │   ├── blog-generator.ts     # 글 생성 오케스트레이터
│   │   ├── prompt-builder.ts     # 프롬프트 조립 로직
│   │   ├── tone-presets.ts       # 톤 프리셋 정의
│   │   └── templates/
│   │       └── restaurant.ts     # 맛집 프롬프트 템플릿
│   │
│   ├── scraper/
│   │   ├── types.ts              # StoreInfo, ScraperResult 등
│   │   ├── naver-map-scraper.ts  # 네이버 지도 크롤링
│   │   └── parser.ts             # 응답 → 구조화 데이터
│   │
│   └── llm/
│       ├── types.ts              # LLMProvider 인터페이스
│       ├── provider-factory.ts   # 팩토리 패턴
│       ├── openai-provider.ts
│       └── claude-provider.ts
│
├── components/                   # UI 컴포넌트
│   ├── blog-form/
│   │   └── BlogForm.tsx
│   ├── image-uploader/
│   │   └── ImageUploader.tsx
│   ├── blog-preview/
│   │   └── BlogPreview.tsx
│   └── ui/                       # 공통 UI
│       ├── Button.tsx
│       ├── Select.tsx
│       └── CopyButton.tsx
│
├── .env.local                    # API 키
├── package.json
└── next.config.ts
```

### 레이어 분리 원칙

- `app/` — Next.js 의존. 라우팅과 API 엔드포인트만 담당.
- `features/` — 프레임워크 무관한 순수 비즈니스 로직. 테스트 용이.
- `components/` — UI 컴포넌트. features의 타입을 사용하되 로직은 호출만.

### 핵심 인터페이스

```typescript
// features/llm/types.ts
interface LLMProvider {
  generateText(prompt: string, images?: string[]): Promise<string>
}

// features/scraper/types.ts
interface StoreInfoScraper {
  scrape(url: string): Promise<StoreInfo>
}

interface StoreInfo {
  address: string
  businessHours: string
  menus: { name: string; price: string }[]
  category: string
  phone: string
}
```

### 데이터 흐름

```
1. 사용자 폼 입력 (클라이언트)
2. 이미지 → base64 변환 (클라이언트)
3. 네이버 지도 URL → POST /api/scrape → StoreInfo 반환
4. 전체 데이터 → POST /api/generate
   a. 레퍼런스 글 있으면 → LLM 톤 분석 (1차 호출)
   b. 프롬프트 조립 (가게정보 + 톤 + 필수문구 + 이미지 분석)
   c. LLM 글 생성 (2차 호출)
5. HTML 블로그 글 → 클라이언트에서 미리보기 + 복사
```

---

## 5. 네이버 지도 크롤링

### 방식

네이버 지도 URL에서 place ID 추출 → 네이버 내부 place API 직접 호출 → JSON 파싱.

- URL 패턴: `https://map.naver.com/v5/entry/place/{placeId}` 또는 유사 패턴
- 내부 API는 별도 인증 없이 호출 가능 (공개 데이터)

### 추출 대상

| 필드 | 용도 |
|------|------|
| 주소 | 블로그 글 하단 정보란 |
| 영업시간 | 방문 참고 정보 |
| 메뉴/가격 | 메뉴 소개 섹션 |
| 카테고리 | 프롬프트 컨텍스트 (한식/중식/양식 등) |
| 전화번호 | 하단 정보란 |

### 실패 처리

크롤링 실패 시 → "자동 수집 실패" 알림 + 수동 입력 폼 노출.
사용자가 직접 주소, 메뉴 등을 입력할 수 있도록 폴백 제공.

---

## 6. 프롬프트 전략

### 프롬프트 구성 (레이어링)

```
[시스템 프롬프트]
├ 역할: 네이버 블로그 맛집 리뷰 전문 작성자
├ 규칙: 1500자 내외, 네이버 블로그 HTML 형식
├ 내돈내산/협찬 표기 규칙
└ 이미지 배치 마커 삽입 규칙

[톤 프롬프트]
├ 프리셋: 친근체 / 정보전달형 / 감성체
└ 커스텀: 레퍼런스 글 분석 결과 주입

[컨텍스트]
├ 가게 정보 (크롤링 or 수동 입력)
├ 이미지 비전 분석 결과 (ON일 때)
├ 필수 포함 문구
└ 협찬 정보
```

### 톤 프리셋

| 프리셋 | 특징 |
|--------|------|
| 친근체 | "~했어요", 감탄사, 이모티콘 가이드 |
| 정보전달형 | 간결한 문장, 수치/팩트 중심 |
| 감성체 | 형용사 풍부, 분위기/감정 묘사 |

### 레퍼런스 글 기반 톤 학습

1. 사용자가 블로그 URL 또는 텍스트 입력
2. URL이면 크롤링하여 본문 추출
3. LLM에 문체 분석 요청 (1차 호출) → 톤 특징 추출
4. 분석 결과를 톤 프롬프트에 주입 후 글 생성 (2차 호출)

### 출력 형식

```html
<div>
  <p>인트로 (방문 계기, 분위기)</p>
  [이미지 1~2]
  <p>메뉴 소개 & 맛 묘사</p>
  [이미지 3~5]
  <p>상세 리뷰 (필수 문구 포함)</p>
  [이미지 6~8]
  <p>마무리 (총평, 추천 여부)</p>
  <p>가게 정보 (주소, 영업시간, 네이버 지도 링크)</p>
</div>
```

---

## 7. 비용 구조

### LLM 비용 (1회 생성, 이미지 10장 비전 분석 기준)

| LLM | 비전 ON | 비전 OFF |
|-----|---------|---------|
| GPT-4o | ~$0.13 | ~$0.04 |
| Claude Sonnet | ~$0.09 | ~$0.04 |

### 단계별 월 비용

| 단계 | 월 비용 |
|------|---------|
| 개인 사용 (~30회) | $0~4 |
| 지인 공유 (~200회) | $20~40 (Vercel Pro 포함) |
| SaaS 초기 (~1000회) | $110~170 |

### 비용 절감 포인트

- 이미지 비전 ON/OFF 토글
- Claude Sonnet 기본 (GPT-4o 대비 ~30% 저렴)
- SaaS 전환 시 사용자 API 키 입력으로 LLM 비용 전가

---

## 8. 확장 포인트

| 확장 | 변경 범위 |
|------|----------|
| 카테고리 추가 (카페, 숙소 등) | `features/blog/templates/`에 파일 추가 |
| 새 LLM 추가 | `features/llm/`에 provider 파일 추가 |
| 사용자 인증 | `app/` 미들웨어 추가, 비즈니스 로직 변경 없음 |
| DB 추가 (히스토리) | `features/storage/` 추가 |
| 자동 포스팅 | `features/publisher/` 추가 |
| 카카오맵 지원 | `features/scraper/`에 scraper 추가 |

---

## 9. MVP 범위

### 포함

- 싱글 페이지 폼 (모든 입력 항목)
- 네이버 지도 크롤링 (내부 API 방식)
- LLM 글 생성 (Claude Sonnet, GPT-4o)
- 이미지 비전 분석 ON/OFF
- 톤 프리셋 3종 + 레퍼런스 글 기반 커스텀 톤
- 필수 포함 문구
- 텍스트/HTML 복사
- 이미지 배치 가이드
- 리치텍스트 클립보드 복사 실험

### 미포함 (나중에)

- 자동 포스팅 (네이버 로그인 연동)
- 사용자 인증/회원가입
- 생성 히스토리 저장
- 맛집 외 카테고리
- 과금 시스템
