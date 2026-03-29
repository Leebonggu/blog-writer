"use client";

import type { BlogOutput } from "@/features/blog/types";
import { CopyButton } from "@/components/ui/CopyButton";

interface BlogPreviewProps {
  result: BlogOutput;
  images: string[];
}

export function BlogPreview({ result, images }: BlogPreviewProps) {
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

  // Rich text version: images replaced with placeholder text (no base64 to avoid 5MB limit)
  const richHtml = result.html.replace(
    /\[IMAGE_(\d+)\]\s*(?:<!--.*?-->)?/g,
    (_, num) => {
      const guide = result.imageGuide.find((g) => g.imageIndex === parseInt(num, 10));
      const desc = guide?.description ?? `이미지 ${num}`;
      return `<p style="margin:12px 0;padding:12px;background:#f3f4f6;border-radius:8px;text-align:center;color:#6b7280;font-size:14px">[${desc}]</p>`;
    },
  );

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-800">생성 결과</h2>

      {/* Title */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <span className="text-xs text-gray-500 block mb-1">추천 제목</span>
          <span className="text-base font-bold text-gray-900">{result.title}</span>
        </div>
        <CopyButton text={result.title} label="제목 복사" />
      </div>

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

      {/* Copy Buttons */}
      <div className="flex gap-2">
        <CopyButton text={result.plainText} label="텍스트 복사" />
        <CopyButton
          text={result.plainText}
          richHtml={richHtml}
          label="리치텍스트 복사"
        />
      </div>
    </div>
  );
}
