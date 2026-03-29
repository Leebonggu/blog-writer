@AGENTS.md

# naver-blog-writer 프로젝트 가이드

## 프로젝트 개요

네이버 블로그 형식의 맛집/배달/소품샵 리뷰 포스팅을 LLM으로 자동 생성하는 웹앱.
Next.js App Router + TypeScript + Tailwind CSS. DB 없음.

## 아키텍처 (3레이어)

```
app/           → Next.js 라우트 & API (프레임워크 의존)
features/      → 비즈니스 로직 (프레임워크 무관, 테스트 용이)
components/    → UI 컴포넌트
```

## 핵심 디렉토리 구조

```
features/
├── llm/                    # LLM 추상화
│   ├── types.ts            # LLMProvider 인터페이스
│   ├── provider-factory.ts # createProvider(model, keys)
│   ├── claude-provider.ts
│   └── openai-provider.ts
├── scraper/                # 네이버 지도 크롤링
│   ├── types.ts            # StoreInfo 타입
│   ├── naver-map-scraper.ts # m.place.naver.com Apollo State 파싱
│   └── parser.ts           # (미사용, 레거시)
└── blog/                   # 글 생성 핵심 로직
    ├── types.ts            # BlogInput, BlogOutput, CategoryId 등
    ├── tone-presets.ts     # 친근체/정보전달형/감성체
    ├── prompt-builder.ts   # 프롬프트 조립
    ├── blog-generator.ts   # 오케스트레이터 (톤분석→비전→생성)
    └── templates/          # 카테고리별 프롬프트
        ├── base.ts         # 공통 규칙 (행간, strong, 이미지마커)
        ├── index.ts        # 카테고리 레지스트리
        ├── restaurant.ts   # 맛집
        ├── delivery.ts     # 배달
        └── shop.ts         # 소품샵
```

## 주요 수정 시나리오

### 프롬프트 튜닝
- 공통 규칙 → `features/blog/templates/base.ts`
- 카테고리별 글 구조 → `features/blog/templates/{category}.ts`
- 톤 프리셋 → `features/blog/tone-presets.ts`
- 프롬프트 조립 로직 → `features/blog/prompt-builder.ts`

### 새 카테고리 추가
1. `features/blog/templates/{name}.ts` 생성 (기존 템플릿 참고)
2. `features/blog/templates/index.ts`의 `CATEGORIES` 배열에 추가
3. `components/blog-form/BlogForm.tsx`의 카테고리 버튼 배열에 추가

### 새 LLM 추가
1. `features/llm/{name}-provider.ts` 생성 (LLMProvider 인터페이스 구현)
2. `features/llm/types.ts`의 LLMModel 타입에 추가
3. `features/llm/provider-factory.ts`의 switch에 추가
4. `.env.local`에 API 키 추가

### 크롤링 깨졌을 때
- `features/scraper/naver-map-scraper.ts` 수정
- 네이버가 m.place.naver.com 구조를 바꾸면 `extractApolloState()` 또는 `parseApolloState()` 수정 필요
- 테스트: `__tests__/features/scraper/`

### BlogInput에 새 필드 추가
1. `features/blog/types.ts`에 타입 추가
2. `features/blog/prompt-builder.ts`의 PromptInput에 추가 + 프롬프트에 반영
3. `features/blog/blog-generator.ts`에서 전달
4. `app/api/generate/route.ts`에서 body에서 꺼내서 전달
5. `components/blog-form/BlogForm.tsx`에 UI + state + body에 추가

## 명령어

```bash
npm run dev        # 개발 서버 (localhost:3000)
npm run build      # 프로덕션 빌드
npm run test       # 전체 테스트 (vitest)
npm run test:watch # 테스트 워치 모드
```

## 테스트

```
__tests__/
├── features/
│   ├── llm/        # LLM provider 모킹 테스트
│   ├── scraper/    # 크롤링 파싱 테스트
│   └── blog/       # 톤프리셋, 프롬프트빌더, 제너레이터
└── api/            # API route 통합 테스트
```

## 환경변수

```
ANTHROPIC_API_KEY  # Claude 사용 시 필수
OPENAI_API_KEY     # GPT-4o 사용 시 필수
```

## 주의사항

- 네이버 크롤링은 `m.place.naver.com`의 `__APOLLO_STATE__` 에서 데이터 추출. 네이버가 구조 바꾸면 깨질 수 있음.
- `naver.me` 단축 URL은 redirect를 따라가서 place ID 추출.
- 이미지는 base64로 LLM에 직접 전달 (서버 저장 없음).
- 리치텍스트 복사 시 이미지는 제외 (5MB 제한 우회).
- `<h2>` 태그는 네이버 블로그 에디터에서 리치텍스트 붙여넣기 시 큰 글씨로 동작 확인됨.
