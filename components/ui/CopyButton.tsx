"use client";

import { useState } from "react";
import { Button } from "./Button";

interface CopyButtonProps {
  text: string;
  label: string;
  richHtml?: string;
}

export function CopyButton({ text, label, richHtml }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (richHtml) {
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
