# 네이버 블로그 글 생성기

네이버 블로그 형식에 맞는 리뷰 포스팅을 AI로 자동 생성하는 웹앱.

## 기능

- **카테고리별 글 생성** — 맛집 / 배달 / 소품샵
- **네이버 지도 크롤링** — URL 입력만으로 가게 정보 자동 수집
- **이미지 비전 분석** — 업로드된 사진을 AI가 분석하여 맛/분위기 묘사 자동 생성
- **톤 선택** — 친근체 / 정보전달형 / 감성체 / 레퍼런스 글 기반 커스텀
- **리치텍스트 복사** — 네이버 블로그 에디터에 서식 유지 붙여넣기 (h2 큰 글씨 포함)
- **SEO 최적화 제목** — 지역명 + 카테고리 + 상호명 포함 제목 자동 생성
- **멀티 LLM** — Claude Sonnet / GPT-4o

## 시작하기

```bash
npm install
cp .env.example .env.local
# .env.local에 API 키 입력
npm run dev
```

http://localhost:3000 접속.

## 환경변수

| 변수 | 설명 |
|------|------|
| `ANTHROPIC_API_KEY` | Claude 사용 시 필수 |
| `OPENAI_API_KEY` | GPT-4o 사용 시 필수 |

## 기술 스택

- Next.js (App Router) + TypeScript + Tailwind CSS
- Anthropic SDK / OpenAI SDK
- Vitest

## 프로젝트 구조

```
app/           → 라우트 & API
features/      → 비즈니스 로직 (LLM, 크롤러, 글 생성)
components/    → UI 컴포넌트
```

상세 가이드: [USAGE.md](USAGE.md) | 유지보수 가이드: [CLAUDE.md](CLAUDE.md)
