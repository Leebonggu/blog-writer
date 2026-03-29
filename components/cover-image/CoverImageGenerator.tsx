"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface CoverImageGeneratorProps {
  backgroundImage: string; // base64 data URL
  storeName: string;
  locationCategory: string; // e.g. "신사역 중식당"
  subtitle: string; // e.g. "아늑한 중국 가정식요리 맛집"
}

const CANVAS_SIZE = 1080;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const chars = [...text];
  const lines: string[] = [];
  let current = "";

  for (const char of chars) {
    const test = current + char;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawCover(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  storeName: string,
  locationCategory: string,
  subtitle: string,
) {
  const ctx = canvas.getContext("2d")!;
  const size = CANVAS_SIZE;
  canvas.width = size;
  canvas.height = size;

  // Draw background image (cover fit)
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

  // Dark overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, size, size);

  // Main text settings
  const maxTextWidth = size * 0.85;
  const mainFontSize = Math.round(size * 0.1);
  const subFontSize = Math.round(size * 0.045);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Collect all main text lines
  ctx.font = `900 ${mainFontSize}px -apple-system, "Noto Sans KR", sans-serif`;
  const line1Lines = locationCategory ? wrapText(ctx, locationCategory, maxTextWidth) : [];
  const line2Lines = wrapText(ctx, storeName, maxTextWidth);
  const allMainLines = [...line1Lines, ...line2Lines];

  const lineHeight = mainFontSize * 1.25;
  const subtitleHeight = subFontSize * 2.5;
  const gap = size * 0.04;

  const totalMainHeight = allMainLines.length * lineHeight;
  const totalHeight = totalMainHeight + gap + subtitleHeight;
  const startY = (size - totalHeight) / 2 + lineHeight / 2;

  // Draw main text with stroke
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.round(size * 0.006);
  ctx.lineJoin = "round";

  allMainLines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    ctx.strokeText(line, size / 2, y);
    ctx.fillText(line, size / 2, y);
  });

  // Draw subtitle bar
  if (subtitle) {
    ctx.font = `700 ${subFontSize}px -apple-system, "Noto Sans KR", sans-serif`;
    const subtitleY = startY + totalMainHeight + gap;
    const textWidth = ctx.measureText(subtitle).width;
    const barPadding = size * 0.03;
    const barWidth = textWidth + barPadding * 2;
    const barHeight = subtitleHeight;

    // Blue bar
    ctx.fillStyle = "rgba(59, 130, 246, 0.85)";
    ctx.fillRect(
      (size - barWidth) / 2,
      subtitleY - barHeight / 2,
      barWidth,
      barHeight,
    );

    // Subtitle text
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 0;
    ctx.fillText(subtitle, size / 2, subtitleY);
  }
}

export function CoverImageGenerator({
  backgroundImage,
  storeName,
  locationCategory,
  subtitle,
}: CoverImageGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [editLocationCategory, setEditLocationCategory] = useState(locationCategory);
  const [editStoreName, setEditStoreName] = useState(storeName);
  const [editSubtitle, setEditSubtitle] = useState(subtitle);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgElement(img);
    img.src = backgroundImage;
  }, [backgroundImage]);

  const redraw = useCallback(() => {
    if (!canvasRef.current || !imgElement) return;
    drawCover(canvasRef.current, imgElement, editStoreName, editLocationCategory, editSubtitle);
  }, [imgElement, editStoreName, editLocationCategory, editSubtitle]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${editStoreName || "cover"}_대문이미지.jpg`;
    link.href = canvasRef.current.toDataURL("image/jpeg", 0.92);
    link.click();
  };

  const handleCopy = async () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold text-gray-800">대문 이미지</h3>

      <canvas
        ref={canvasRef}
        className="w-full max-w-md rounded-lg border border-gray-200"
        style={{ aspectRatio: "1/1" }}
      />

      <div className="grid grid-cols-1 gap-2">
        <input
          type="text"
          value={editLocationCategory}
          onChange={(e) => setEditLocationCategory(e.target.value)}
          placeholder="지역 카테고리 (예: 신사역 중식당)"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={editStoreName}
          onChange={(e) => setEditStoreName(e.target.value)}
          placeholder="상호명"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={editSubtitle}
          onChange={(e) => setEditSubtitle(e.target.value)}
          placeholder="한줄 소개 (예: 아늑한 중국 가정식요리 맛집)"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDownload}
          className="flex-1 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          다운로드
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
        >
          클립보드 복사
        </button>
      </div>
    </div>
  );
}
