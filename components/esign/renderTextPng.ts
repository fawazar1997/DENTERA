// Browser only: draws a value (Arabic or not) into a transparent PNG the
// size of its box, with the site font, so the signed PDF shows the text
// exactly as it looks on screen (pdf-lib can't shape Arabic itself).

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const FONT = "Almarai";
/** Pixels per PDF point in the image (sharp when printed). */
const SCALE = 4;

let fontReady: Promise<unknown> | null = null;

/** Waits for the site font, so the first image isn't drawn in a fallback font. */
export function loadEsignFont(): Promise<unknown> {
  fontReady ??= Promise.all([
    document.fonts.load(`700 20px ${FONT}`, "نص Aa 123"),
    document.fonts.load(`400 20px ${FONT}`, "نص Aa 123"),
  ]).catch(() => undefined);
  return fontReady;
}

/** A value as it is printed: dates as 2026/11/17. */
export function displayValue(value: string, varType?: string): string {
  const v = value.trim();
  if (varType === "date" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v.replace(/-/g, "/");
  return v;
}

/**
 * Draws `text` into a box of `boxW`×`boxH` PDF points at `fontSize` points
 * (smaller if it doesn't fit), aligned start / center / end in reading
 * order. Returns a PNG data URL.
 */
export async function renderTextPng(input: {
  text: string;
  boxW: number;
  boxH: number;
  fontSize?: number;
  align?: "start" | "center" | "end";
  bold?: boolean;
}): Promise<string> {
  await loadEsignFont();
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(input.boxW * SCALE));
  canvas.height = Math.max(1, Math.round(input.boxH * SCALE));
  const ctx = canvas.getContext("2d")!;
  const rtl = ARABIC.test(input.text);
  const weight = input.bold ? 700 : 400;
  let size = Math.min((input.fontSize ?? 11) * SCALE, canvas.height * 0.9);
  const pad = 1.5 * SCALE;
  const font = () => `${weight} ${size}px ${FONT}, "Segoe UI", Tahoma, sans-serif`;
  ctx.font = font();
  while (size > 4 * SCALE && ctx.measureText(input.text).width > canvas.width - pad * 2) {
    size -= SCALE / 2;
    ctx.font = font();
  }
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#111827";
  const align = input.align ?? "start";
  // Start is the right edge for Arabic, the left for Latin.
  const leftEdge = align === "center" ? false : (align === "start") !== rtl;
  if (align === "center") {
    ctx.textAlign = "center";
    ctx.fillText(input.text, canvas.width / 2, canvas.height / 2);
  } else if (leftEdge) {
    ctx.textAlign = "left";
    ctx.fillText(input.text, pad, canvas.height / 2);
  } else {
    ctx.textAlign = "right";
    ctx.fillText(input.text, canvas.width - pad, canvas.height / 2);
  }
  return canvas.toDataURL("image/png");
}
