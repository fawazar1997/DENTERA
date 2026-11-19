// Browser only: draws a value (Arabic or not) into a transparent PNG the
// size of its box, in black and the box's font, so the signed PDF shows the
// text exactly as previewed (pdf-lib can't shape Arabic itself).
//
// Fitting: the text stays at the box's size on one line if it fits;
// otherwise it wraps onto more lines inside the box; only if the wrapped
// lines still don't fit does it get smaller.

import type { EsignFont } from "@/lib/esignTypes";

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
/** Pixels per PDF point in the image (sharp when printed). */
const SCALE = 4;
const LINE_HEIGHT = 1.3;
const MIN_SIZE = 5;
const INK = "#000000";

/**
 * Font stacks. Cambria is used where installed (Windows, Office); Caladea,
 * its free metric twin, otherwise. Arabic letters fall through to Almarai
 * (Cambria has none).
 */
const STACKS: Record<EsignFont, string> = {
  dentera: `Almarai, "Segoe UI", Tahoma, sans-serif`,
  cambria: `Cambria, Caladea, Almarai, "Times New Roman", serif`,
};

/** The CSS font stack of a box's font (for on-screen previews). */
export function fontStack(font?: EsignFont): string {
  return STACKS[font ?? "dentera"];
}

let fontReady: Promise<unknown> | null = null;

/** Loads both fonts (Caladea from Google Fonts), so no image is drawn in a fallback. */
export function loadEsignFont(): Promise<unknown> {
  if (!fontReady) {
    if (!document.querySelector('link[data-esign-fonts]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Almarai:wght@400;700&family=Caladea:wght@400;700&display=swap";
      link.dataset.esignFonts = "1";
      document.head.appendChild(link);
    }
    const sample = "نص Aa 123";
    fontReady = new Promise((r) => setTimeout(r, 50))
      .then(() =>
        Promise.all([
          document.fonts.load(`700 20px Almarai`, sample),
          document.fonts.load(`400 20px Almarai`, sample),
          document.fonts.load(`700 20px Caladea`, "Aa 123"),
          document.fonts.load(`400 20px Caladea`, "Aa 123"),
        ])
      )
      .catch(() => undefined);
  }
  return fontReady;
}

/** A value as it is printed: dates as 2026/11/17. */
export function displayValue(value: string, varType?: string): string {
  const v = value.trim();
  if (varType === "date" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v.replace(/-/g, "/");
  return v;
}

export type RenderedText = {
  url: string;
  /** The size used ÷ the size asked (below 1: shrunk to fit). */
  scale: number;
  /** Lines used. */
  lines: number;
  /** True when even the smallest size didn't fit (cut off). */
  overflow: boolean;
};

/** Breaks text into lines no wider than `width` at the context's current font. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (!line || ctx.measureText(next).width <= width) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/**
 * Draws `text` into a box of `boxW`×`boxH` PDF points at `fontSize` points,
 * wrapping and then shrinking only as needed, aligned start / center / end
 * in reading order. Returns the PNG and how it was fitted.
 */
export async function renderTextPng(input: {
  text: string;
  boxW: number;
  boxH: number;
  fontSize?: number;
  align?: "start" | "center" | "end";
  bold?: boolean;
  font?: EsignFont;
}): Promise<RenderedText> {
  await loadEsignFont();
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(input.boxW * SCALE));
  canvas.height = Math.max(1, Math.round(input.boxH * SCALE));
  const ctx = canvas.getContext("2d")!;
  const text = input.text.replace(/\s+/g, " ").trim();
  const rtl = ARABIC.test(text);
  const weight = input.bold ? 700 : 400;
  const stack = fontStack(input.font);
  const pad = 1.5 * SCALE;
  const maxW = canvas.width - pad * 2;
  const asked = Math.max(MIN_SIZE, input.fontSize ?? 11);

  // The largest size (from the one asked, in half points) whose wrapped
  // lines fit the box.
  let size = asked;
  let lines: string[] = [text];
  let overflow = false;
  for (;;) {
    ctx.font = `${weight} ${size * SCALE}px ${stack}`;
    const oneLine = ctx.measureText(text).width <= maxW;
    lines = oneLine ? [text] : wrap(ctx, text, maxW);
    const tooWide = lines.some((l) => ctx.measureText(l).width > maxW);
    const height = lines.length * size * SCALE * LINE_HEIGHT;
    if (!tooWide && height <= canvas.height + 0.5) break;
    if (size <= MIN_SIZE) {
      overflow = true;
      break;
    }
    size = Math.max(MIN_SIZE, size - 0.5);
  }

  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textBaseline = "middle";
  ctx.fillStyle = INK;
  const align = input.align ?? "start";
  const lineH = size * SCALE * LINE_HEIGHT;
  const top = (canvas.height - lines.length * lineH) / 2 + lineH / 2;
  const leftEdge = align !== "center" && (align === "start") !== rtl;
  ctx.textAlign = align === "center" ? "center" : leftEdge ? "left" : "right";
  const x = align === "center" ? canvas.width / 2 : leftEdge ? pad : canvas.width - pad;
  lines.forEach((line, i) => ctx.fillText(line, x, top + i * lineH));
  return { url: canvas.toDataURL("image/png"), scale: size / asked, lines: lines.length, overflow };
}
