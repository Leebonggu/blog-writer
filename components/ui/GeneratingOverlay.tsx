"use client";

import { useState, useEffect } from "react";

interface GeneratingOverlayProps {
  useVision: boolean;
  imageCount: number;
  hasReference: boolean;
}

interface Step {
  label: string;
  estimatedSeconds: number;
}

function getSteps(useVision: boolean, imageCount: number, hasReference: boolean): Step[] {
  const steps: Step[] = [];

  if (hasReference) {
    steps.push({ label: "레퍼런스 글 문체 분석 중...", estimatedSeconds: 5 });
  }

  if (useVision && imageCount > 0) {
    const visionTime = Math.max(5, Math.min(imageCount * 2, 20));
    steps.push({ label: `이미지 ${imageCount}장 비전 분석 중...`, estimatedSeconds: visionTime });
  }

  steps.push({ label: "블로그 글 생성 중...", estimatedSeconds: 15 });

  return steps;
}

export function GeneratingOverlay({ useVision, imageCount, hasReference }: GeneratingOverlayProps) {
  const steps = getSteps(useVision, imageCount, hasReference);
  const totalEstimated = steps.reduce((sum, s) => sum + s.estimatedSeconds, 0);

  const [elapsed, setElapsed] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Advance step based on elapsed time
  useEffect(() => {
    let cumulative = 0;
    for (let i = 0; i < steps.length; i++) {
      cumulative += steps[i].estimatedSeconds;
      if (elapsed < cumulative) {
        setCurrentStepIndex(i);
        return;
      }
    }
    setCurrentStepIndex(steps.length - 1);
  }, [elapsed, steps]);

  const progress = Math.min((elapsed / totalEstimated) * 100, 95);
  const currentStep = steps[currentStepIndex];

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}초`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}분 ${sec}초`;
  };

  const remaining = Math.max(0, totalEstimated - elapsed);

  return (
    <div className="border border-green-200 bg-green-50 rounded-lg p-6 space-y-4">
      {/* Current step */}
      <div className="flex items-center gap-3">
        <div className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full" />
        <span className="text-sm font-medium text-green-800">{currentStep.label}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-green-200 rounded-full h-2">
        <div
          className="bg-green-600 h-2 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Time info */}
      <div className="flex justify-between text-xs text-green-700">
        <span>경과: {formatTime(elapsed)}</span>
        <span>
          {remaining > 0
            ? `예상 남은 시간: ~${formatTime(remaining)}`
            : "거의 완료됩니다..."}
        </span>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              i < currentStepIndex
                ? "bg-green-600 text-white"
                : i === currentStepIndex
                ? "bg-green-100 text-green-800 border border-green-400"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {i < currentStepIndex ? "V " : i === currentStepIndex ? "" : ""}
            {step.label.replace("...", "").replace(" 중", "")}
          </div>
        ))}
      </div>
    </div>
  );
}
