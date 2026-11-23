// Browser only: cutting a document's body into A4 pages, and making the
// page images.
//
// Pages: the body is laid out once at the page's text width. A page ends
// at the lowest point that doesn't cut through a line of text, a table row
// or a signature block; a heading is never left at the bottom of a page and
// a signature block keeps the line just before it; a page break starts a new
// page. Each signature / stamp box is then located on its page (0–1 of the
// page), which is where the signature is printed.
//
// Images: each page is drawn by the browser itself (an SVG with the page's
// HTML inside, onto a canvas), so Arabic is shaped exactly as on screen.

import type { EsignDocSettings, EsignField } from "@/lib/esignTypes";
import { DOC_CSS, MARGIN_X, PAGE_H, PAGE_W, contentBox, fontFaceCss } from "./docStyles";
import type { PageSlice } from "./renderDocument";

const FONT_PATH = "/fonts/esign/";
export const LOGO_PATH = "/brand/dentera-logo-color.png";

let fontsReady: Promise<void> | null = null;

/** Adds the document fonts and styles to the page once, and waits for the fonts. */
export function ensureDocFonts(): Promise<void> {
  if (!fontsReady) {
    if (!document.getElementById("esign-doc-css")) {
      const style = document.createElement("style");
      style.id = "esign-doc-css";
      style.textContent = `${fontFaceCss((f) => FONT_PATH + f)}\n${DOC_CSS}`;
      document.head.appendChild(style);
    }
    fontsReady = Promise.all(
      ["400", "700"].flatMap((w) => [
        document.fonts.load(`${w} 16px EsignAlmarai`, "نص عربي Aa 123"),
        document.fonts.load(`${w} 16px EsignCaladea`, "Aa 123"),
      ])
    )
      .then(() => document.fonts.ready)
      .then(() => undefined)
      .catch(() => undefined);
  }
  return fontsReady;
}

export type MeasuredField = Pick<EsignField, "kind" | "stepId" | "page" | "x" | "y" | "w" | "h">;
export type DocLayout = { pages: PageSlice[]; fields: MeasuredField[] };

type Interval = { top: number; bottom: number; kind: "line" | "head" | "sig" | "row" | "block" };

/** Lays the body out off-screen and cuts it into pages. */
export async function measureDocument(bodyHtml: string, settings: EsignDocSettings): Promise<DocLayout> {
  await ensureDocFonts();
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:absolute;left:-20000px;top:0;visibility:hidden;pointer-events:none;";
  host.innerHTML = bodyHtml;
  document.body.appendChild(host);
  try {
    return cut(host.firstElementChild as HTMLElement, contentBox(settings));
  } finally {
    host.remove();
  }
}

function cut(root: HTMLElement, box: { top: number; height: number }): DocLayout {
  const rootRect = root.getBoundingClientRect();
  const T = rootRect.top;
  const L = rootRect.left;
  const total = rootRect.height;
  const H = box.height;
  const intervals: Interval[] = [];
  const add = (r: DOMRect | { top: number; bottom: number }, kind: Interval["kind"]) => {
    if (r.bottom - r.top > 0.5) intervals.push({ top: r.top - T, bottom: r.bottom - T, kind });
  };

  // Signature blocks and table rows are never cut (a row taller than a page is, between its lines).
  const sigs = Array.from(root.querySelectorAll<HTMLElement>(".esign-sig"));
  sigs.forEach((el) => add(el.getBoundingClientRect(), "sig"));
  const keptRows = new Set<Element>();
  root.querySelectorAll("tr").forEach((tr) => {
    const r = tr.getBoundingClientRect();
    if (r.height <= H) {
      keptRows.add(tr);
      add(r, tr.querySelector(".esign-sig") ? "sig" : "row");
    }
  });
  root.querySelectorAll("hr").forEach((el) => add(el.getBoundingClientRect(), "block"));
  // Empty paragraphs still take a line.
  root.querySelectorAll("p,h1,h2,h3").forEach((el) => {
    if (!el.textContent?.trim()) add(el.getBoundingClientRect(), "block");
  });
  // Each line of text.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    const parent = node.parentElement;
    if (!parent || parent.closest(".esign-sig")) continue;
    const row = parent.closest("tr");
    if (row && keptRows.has(row)) continue;
    const kind = parent.closest("h1,h2,h3") ? "head" : "line";
    range.selectNodeContents(node);
    for (const r of Array.from(range.getClientRects())) add(r, kind);
  }
  intervals.sort((a, b) => a.top - b.top);

  const valid = (y: number) => !intervals.some((iv) => iv.top < y - 0.5 && iv.bottom > y + 0.5);
  const breaks = Array.from(root.querySelectorAll<HTMLElement>("[data-pagebreak]"))
    .map((el) => el.getBoundingClientRect().top - T)
    .sort((a, b) => a - b);
  // Glyphs (Arabic marks, descenders) reach past a line's box: a page is cut
  // in the gap between the last line above and the first line below it, a
  // little below one and a little above the other (blank space between dropped).
  const PAD = 8;
  const gapAt = (y: number) => {
    const above = intervals.reduce((m, iv) => (iv.bottom <= y + 0.5 && iv.bottom > m ? iv.bottom : m), -Infinity);
    const below = intervals.reduce((m, iv) => (iv.top >= y - 0.5 && iv.top < m ? iv.top : m), Infinity);
    return { above, below };
  };
  const cutAt = (y: number, limit: number) => {
    const { above, below } = gapAt(y);
    if (!Number.isFinite(above)) return { end: y, next: y };
    if (!Number.isFinite(below)) return { end: Math.min(limit, above + PAD), next: total };
    // A forced cut (something taller than a page) stays where it is.
    if (!valid(y)) return { end: y, next: y };
    const pad = Math.min(PAD, Math.max(0, (below - above) / 2));
    const end = Math.min(limit, above + pad);
    return { end, next: Math.max(end, below - pad) };
  };
  const nextStart = (y: number) => cutAt(y, Infinity).next;

  const pages: PageSlice[] = [];
  let start = intervals.length ? Math.min(0, intervals[0].top) : 0;
  for (let guard = 0; start < total - 1 && guard < 200; guard++) {
    const limit = start + H;
    const forced = breaks.find((b) => b > start + 1 && b <= limit);
    if (forced !== undefined) {
      pages.push({ start, end: forced });
      start = nextStart(forced);
      continue;
    }
    if (limit >= total) {
      pages.push({ start, end: total });
      break;
    }
    // The lowest end of a line/row/block that fits and doesn't cut through anything.
    let end = limit;
    const ends = intervals
      .map((iv) => iv.bottom)
      .filter((b) => b > start + 1 && b <= limit)
      .sort((a, b) => b - a);
    const ok = ends.find(valid);
    if (ok !== undefined) end = ok;
    end = keepTogether(end, start, H, intervals);
    const cut = cutAt(end, limit);
    pages.push({ start, end: cut.end });
    start = cut.next;
  }
  if (!pages.length) pages.push({ start: 0, end: Math.max(total, 1) });

  // Where each signature / stamp box landed.
  const fields: MeasuredField[] = [];
  root.querySelectorAll<HTMLElement>("[data-field]").forEach((el) => {
    const r = el.getBoundingClientRect();
    const top = r.top - T;
    const page = pages.findIndex((p) => top >= p.start - 1 && top < p.end);
    if (page === -1) return;
    const kind = el.dataset.field === "stamp" ? "stamp" : "signature";
    fields.push({
      kind,
      stepId: el.dataset.step,
      page,
      x: (r.left - L + MARGIN_X) / PAGE_W,
      y: (top - pages[page].start + box.top) / PAGE_H,
      w: r.width / PAGE_W,
      h: r.height / PAGE_H,
    });
  });
  return { pages, fields };
}

/**
 * Moves a page end up so a heading isn't left at the bottom of a page, and a
 * signature block keeps the line just before it (unless that would leave
 * most of the page empty).
 */
function keepTogether(end: number, start: number, H: number, intervals: Interval[]): number {
  const minEnd = start + H * 0.35;
  const before = intervals.filter((iv) => iv.bottom <= end + 0.5 && iv.top >= start).sort((a, b) => b.bottom - a.bottom)[0];
  const after = intervals.find((iv) => iv.top >= end - 0.5);
  if (before?.kind === "head") {
    // The heading's first line.
    let top = before.top;
    for (const iv of intervals) if (iv.kind === "head" && iv.bottom <= before.bottom + 0.5 && iv.bottom >= top - 2 && iv.top < top) top = iv.top;
    if (top > minEnd) return top;
  }
  if (after?.kind === "sig" && before && (before.kind === "line" || before.kind === "head") && before.top > minEnd) return before.top;
  return end;
}

// --- Page images ---

const dataUrls = new Map<string, Promise<string>>();

/** A same-site file as a data URL (cached). */
export function toDataUrl(url: string): Promise<string> {
  if (!dataUrls.has(url)) {
    dataUrls.set(
      url,
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`${url}: ${r.status}`);
          return r.blob();
        })
        .then(
          (blob) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(blob);
            })
        )
    );
    dataUrls.get(url)!.catch(() => dataUrls.delete(url));
  }
  return dataUrls.get(url)!;
}

let rasterCss: Promise<string> | null = null;

/** The stylesheet inside a page image, with the fonts embedded. */
function pageImageCss(): Promise<string> {
  if (!rasterCss) {
    const files = Array.from(new Set(fontFaceFiles()));
    rasterCss = Promise.all(files.map((f) => toDataUrl(FONT_PATH + f).then((d) => [f, d] as const))).then((pairs) => {
      const map = new Map(pairs);
      return `${fontFaceCss((f) => map.get(f) ?? FONT_PATH + f)}\n${DOC_CSS}`;
    });
    rasterCss.catch(() => (rasterCss = null));
  }
  return rasterCss;
}

function fontFaceFiles(): string[] {
  const out: string[] = [];
  fontFaceCss((f) => (out.push(f), f));
  return out;
}

const FONT_SETTLE_MS = 400;

/** Pixels per CSS pixel in the page images (about 200 dpi). */
export const PAGE_SCALE = 2.1;

/** One page (its HTML, images as data URLs) as a PNG. */
export async function renderPagePng(markup: string, scale = PAGE_SCALE): Promise<Blob> {
  const css = await pageImageCss();
  const wrapper = document.createElement("div");
  wrapper.setAttribute("style", `width:${PAGE_W}px;height:${PAGE_H}px;margin:0;padding:0;background:#ffffff`);
  const style = document.createElement("style");
  style.textContent = css;
  wrapper.appendChild(style);
  const holder = document.createElement("div");
  holder.innerHTML = markup;
  wrapper.appendChild(holder.firstElementChild!);
  const xhtml = new XMLSerializer().serializeToString(wrapper);
  const w = Math.round(PAGE_W * scale);
  const h = Math.round(PAGE_H * scale);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${PAGE_W} ${PAGE_H}"><foreignObject x="0" y="0" width="${PAGE_W}" height="${PAGE_H}">${xhtml}</foreignObject></svg>`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  // The page's embedded fonts load inside the image after it first decodes:
  // keep the same image, give the fonts a moment, and draw again.
  const img = new Image();
  img.src = url;
  await img.decode();
  const draw = async (wait: number) => {
    await new Promise((r) => setTimeout(r, wait));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  };
  await draw(0);
  const canvas = await draw(FONT_SETTLE_MS);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("page image failed");
  return blob;
}

/** Most pages a copy may have. */
export const PAGE_COUNT_LIMIT = 60;

export { PAGE_W, PAGE_H };
