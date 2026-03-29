"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ImageUploader } from "@/components/image-uploader/ImageUploader";
import { BlogPreview } from "@/components/blog-preview/BlogPreview";
import { GeneratingOverlay } from "@/components/ui/GeneratingOverlay";
import type { BlogOutput, SponsorType, TonePresetId, RevisitIntent } from "@/features/blog/types";
import type { CategoryId } from "@/features/blog/templates";
import type { LLMModel } from "@/features/llm/types";
import type { StoreInfo } from "@/features/scraper/types";

export function BlogForm() {
  // Form state
  const [category, setCategory] = useState<CategoryId>("restaurant");
  const [storeName, setStoreName] = useState("");
  const [naverMapUrl, setNaverMapUrl] = useState("");
  const [sponsorType, setSponsorType] = useState<SponsorType>("self-paid");
  const [sponsorName, setSponsorName] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [tonePresetId, setTonePresetId] = useState<TonePresetId | "custom">("friendly");
  const [referenceText, setReferenceText] = useState("");
  const [requiredPhrases, setRequiredPhrases] = useState("");
  const [revisitIntent, setRevisitIntent] = useState<RevisitIntent>("definitely");
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

  // Refs
  const resultRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to result when generated
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

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
          category,
          storeName,
          storeInfo: effectiveStoreInfo,
          sponsorType,
          sponsorName: sponsorType === "sponsored" ? sponsorName : undefined,
          images,
          tonePresetId,
          referenceText: tonePresetId === "custom" ? referenceText : undefined,
          requiredPhrases: requiredPhrases || undefined,
          revisitIntent,
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
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
      {/* Category */}
      <section className="space-y-4">
        <div className="flex gap-2">
          {[
            { id: "restaurant" as CategoryId, label: "맛집" },
            { id: "delivery" as CategoryId, label: "배달" },
            { id: "shop" as CategoryId, label: "소품샵" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                category === cat.id
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Basic Info */}
      <section className="space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-800">기본 정보</h2>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            {category === "delivery" ? "브랜드/가게명 *" : "상호명 *"}
          </label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="예: 맛있는 치킨집"
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">네이버 지도 URL *</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={naverMapUrl}
              onChange={(e) => setNaverMapUrl(e.target.value)}
              placeholder="https://naver.me/... 또는 map.naver.com/..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Button variant="secondary" onClick={handleScrape} loading={scraping} className="sm:w-auto w-full">
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
            <input type="text" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} placeholder="주소" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            <input type="text" value={manualHours} onChange={(e) => setManualHours(e.target.value)} placeholder="영업시간 (예: 매일 11:00 - 22:00)" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            <input type="text" value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} placeholder="카테고리 (예: 한식, 치킨)" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            <input type="text" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="전화번호" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            <textarea value={manualMenus} onChange={(e) => setManualMenus(e.target.value)} placeholder={"메뉴 (줄바꿈으로 구분, 형식: 메뉴명, 가격)\n예: 후라이드치킨, 18000원"} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
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
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm mt-2"
            />
          )}
        </div>
      </section>

      {/* Images */}
      <section className="space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-800">이미지</h2>
        <ImageUploader images={images} onChange={setImages} />
      </section>

      {/* Options */}
      <section className="space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-800">글 옵션</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <Select
            label="재방문 의사"
            value={revisitIntent}
            onChange={(e) => setRevisitIntent(e.target.value as RevisitIntent)}
            options={[
              { value: "definitely", label: "꼭 재방문! (강력 추천)" },
              { value: "maybe", label: "기회되면 다시 (괜찮았음)" },
              { value: "no", label: "재방문 없음 (아쉬웠음)" },
            ]}
          />
        </div>

        {tonePresetId === "custom" && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">레퍼런스 글</label>
            <textarea
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              placeholder="참고할 블로그 글의 URL 또는 텍스트를 입력하세요"
              rows={4}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="useVision" checked={useVision} onChange={(e) => setUseVision(e.target.checked)} className="w-4 h-4" />
            <label htmlFor="useVision" className="text-sm text-gray-700">이미지 비전 분석</label>
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
        </div>
      </section>

      {/* Generate */}
      <div className="flex flex-col gap-2 sticky bottom-0 bg-gray-50 py-3 -mx-4 px-4 sm:static sm:bg-transparent sm:py-0 sm:mx-0 sm:px-0">
        <Button onClick={handleGenerate} loading={loading} className="w-full py-3 text-base sm:text-lg">
          글 생성하기
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <GeneratingOverlay
          useVision={useVision}
          imageCount={images.length}
          hasReference={tonePresetId === "custom" && !!referenceText}
        />
      )}

      {/* Result */}
      {result && (
        <section ref={resultRef} className="space-y-4 scroll-mt-4">
          <BlogPreview
            result={result}
            images={images}
            storeName={storeName}
            locationCategory={`${storeInfo?.address?.split(" ").slice(0, 2).join(" ") || ""} ${storeInfo?.category || ""}`.trim()}
          />
          <Button variant="secondary" onClick={handleGenerate} loading={loading} className="w-full sm:w-auto">
            다시 생성하기
          </Button>
        </section>
      )}
    </div>
  );
}
