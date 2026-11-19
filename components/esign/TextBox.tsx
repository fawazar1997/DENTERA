"use client";

import { useEffect, useState } from "react";
import { renderTextPng, type RenderedText } from "./renderTextPng";
import type { EsignFont } from "@/lib/esignTypes";

/**
 * A text box's value as it will be printed: the same image the signed PDF
 * gets (wrapped and fitted the same way). Reports when the text had to be
 * made smaller or was cut off.
 */
export function TextBox({
  text,
  boxW,
  boxH,
  fontSize,
  align,
  bold,
  font,
  onFit,
}: {
  text: string;
  boxW: number;
  boxH: number;
  fontSize?: number;
  align?: "start" | "center" | "end";
  bold?: boolean;
  font?: EsignFont;
  onFit?: (fit: RenderedText) => void;
}) {
  const [image, setImage] = useState<RenderedText | null>(null);
  useEffect(() => {
    let live = true;
    if (!text.trim()) {
      setImage(null);
      return;
    }
    const timer = setTimeout(async () => {
      const result = await renderTextPng({ text, boxW, boxH, fontSize, align, bold, font });
      if (!live) return;
      setImage(result);
      onFit?.(result);
    }, 150);
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, boxW, boxH, fontSize, align, bold, font]);
  if (!image) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={image.url} alt={text} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
