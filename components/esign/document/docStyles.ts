// The look of a document template's pages: the same stylesheet lays out the
// editor, the previews, the measuring for page breaks and the page images,
// so what is previewed is exactly what is signed.

import { docBackground, type EsignDocSettings } from "@/lib/esignTypes";

/** The official letterhead for a page: its image (none when making page images) and text margins. */
export type OfficialFrame = { url?: string; top: number; bottom: number };

/** A4 in CSS pixels (96 per inch). */
export const PAGE_W = 794;
export const PAGE_H = 1123;
export const MARGIN_X = 68;
export const CONTENT_W = PAGE_W - MARGIN_X * 2;

/** Where the text starts and ends on a page (by its background). */
export function contentBox(
  settings: Pick<EsignDocSettings, "letterhead" | "background">,
  official?: OfficialFrame
): { top: number; bottom: number; height: number } {
  const background = docBackground(settings);
  // The official letterhead's page number sits just under the text.
  const top = background === "official" && official ? official.top : background === "dentera" ? 132 : 76;
  const bottom = background === "official" && official ? official.bottom + 22 : background === "dentera" ? 92 : 76;
  return { top, bottom, height: PAGE_H - top - bottom };
}

/** Font families for the documents (self-hosted, so the page images match the screen). */
export const DOC_FONTS = [
  { family: "EsignAlmarai", weight: 400, file: "almarai-arabic-400-normal.woff2", range: "arabic" },
  { family: "EsignAlmarai", weight: 700, file: "almarai-arabic-700-normal.woff2", range: "arabic" },
  { family: "EsignAlmarai", weight: 400, file: "almarai-latin-400-normal.woff2", range: "latin" },
  { family: "EsignAlmarai", weight: 700, file: "almarai-latin-700-normal.woff2", range: "latin" },
  { family: "EsignCaladea", weight: 400, file: "caladea-latin-400-normal.woff2", range: "latin" },
  { family: "EsignCaladea", weight: 700, file: "caladea-latin-700-normal.woff2", range: "latin" },
] as const;

const RANGES = {
  arabic: "U+0600-06FF,U+0750-077F,U+0870-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FEFC",
  latin: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
};

/** @font-face rules; `src` maps a font file to its URL (a path, or a data URL for page images). */
export function fontFaceCss(src: (file: string) => string): string {
  return DOC_FONTS.map(
    (f) =>
      `@font-face{font-family:${f.family};font-style:normal;font-weight:${f.weight};font-display:block;src:url(${src(f.file)}) format("woff2");unicode-range:${RANGES[f.range]};}`
  ).join("\n");
}

export const FONT_STACKS = {
  dentera: `EsignAlmarai, Tahoma, sans-serif`,
  cambria: `EsignCaladea, EsignAlmarai, "Times New Roman", serif`,
} as const;

/** Signature block sizes: width, signature height, stamp size (px). */
export const SIG_SIZES = {
  s: { w: 190, h: 50, stamp: 72 },
  m: { w: 250, h: 70, stamp: 94 },
  l: { w: 320, h: 92, stamp: 118 },
} as const;

/** The document stylesheet (no child selectors with ">" so it can sit in an SVG image). */
export const DOC_CSS = `
.esign-page{position:relative;width:${PAGE_W}px;height:${PAGE_H}px;background:#ffffff;overflow:hidden;color:#000000;box-sizing:border-box;}
.esign-page *{box-sizing:border-box;}
.esign-page img.esign-bg{position:absolute;left:0;top:0;width:${PAGE_W}px;height:${PAGE_H}px;}
.esign-pageno{position:absolute;left:0;right:0;text-align:center;font-family:${FONT_STACKS.dentera};font-size:8pt;color:#6b7280;}
.esign-head{position:absolute;top:34px;left:${MARGIN_X}px;right:${MARGIN_X}px;height:78px;display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #0CB8CD;}
.esign-head img{height:58px;width:auto;}
.esign-head-meta{font-family:${FONT_STACKS.dentera};font-size:8.5pt;color:#4b5563;line-height:1.5;}
.esign-foot{position:absolute;bottom:34px;left:${MARGIN_X}px;right:${MARGIN_X}px;height:34px;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;border-top:1px solid #d1d5db;font-family:${FONT_STACKS.dentera};font-size:8pt;color:#6b7280;padding-top:6px;}
.esign-foot span{white-space:nowrap;}
.esign-foot .esign-foot-line{white-space:normal;overflow:hidden;max-height:2.8em;}
.esign-viewport{position:absolute;left:${MARGIN_X}px;width:${CONTENT_W}px;overflow:hidden;}
.esign-doc{display:flow-root;width:${CONTENT_W}px;line-height:1.65;color:#000000;word-wrap:break-word;overflow-wrap:break-word;}
.esign-doc p{margin:0 0 0.55em 0;min-height:1.65em;}
.esign-doc h1{font-size:1.55em;font-weight:700;margin:0.5em 0 0.45em 0;line-height:1.35;}
.esign-doc h2{font-size:1.28em;font-weight:700;margin:0.55em 0 0.4em 0;line-height:1.4;}
.esign-doc h3{font-size:1.1em;font-weight:700;margin:0.5em 0 0.35em 0;line-height:1.45;}
.esign-doc strong{font-weight:700;}
.esign-doc ul,.esign-doc ol{margin:0 0 0.55em 0;padding-inline-start:1.7em;}
.esign-doc li{margin:0 0 0.2em 0;}
.esign-doc li p{margin:0 0 0.2em 0;}
.esign-doc table{width:100%;border-collapse:collapse;table-layout:fixed;margin:0.2em 0 0.7em 0;}
.esign-doc td,.esign-doc th{border:1px solid #6b7280;padding:5px 8px;vertical-align:top;text-align:start;}
.esign-doc th{background:#f3f4f6;font-weight:700;}
.esign-doc td p,.esign-doc th p{margin:0 0 0.25em 0;}
.esign-doc table.borderless td,.esign-doc table.borderless th{border:none;background:none;padding:4px 6px;}
.esign-doc hr{border:0;border-top:1px solid #9ca3af;margin:0.8em 0;}
.esign-doc .esign-pagebreak{height:0;}
.esign-doc .esign-missing{background:#fde68a;border-radius:3px;padding:0 3px;color:#92400e;}
.esign-sig{display:flex;flex-direction:column;margin:0.5em 0 0.7em 0;max-width:100%;}
.esign-sig.esign-al-start{margin-inline-end:auto;}
.esign-sig.esign-al-center{margin-inline-start:auto;margin-inline-end:auto;align-items:center;}
.esign-sig.esign-al-end{margin-inline-start:auto;}
.esign-doc td .esign-sig{width:100% !important;}
.esign-sig-role{font-weight:700;margin-bottom:4px;}
.esign-stampblock{position:relative;margin:0.4em 0 0.6em 0;max-width:100%;}
.esign-stampblock.esign-al-start{margin-inline-end:auto;}
.esign-stampblock.esign-al-center{margin-inline-start:auto;margin-inline-end:auto;}
.esign-stampblock.esign-al-end{margin-inline-start:auto;}
.esign-doc td .esign-stampblock{max-width:100%;}
.esign-stamp-box{display:flex;align-items:center;justify-content:center;}
.esign-preview .esign-stamp-empty{border:2px dashed var(--c);border-radius:50%;background:var(--cb);color:var(--c);font-size:8pt;font-weight:700;font-family:${FONT_STACKS.dentera};text-align:center;line-height:1.3;padding:4px;}
.esign-sig-row{position:relative;width:100%;}
.esign-sig-box{width:100%;border-bottom:1px solid #374151;}
.esign-sig-stamp{position:absolute;top:50%;inset-inline-end:-8px;transform:translateY(-50%);}
.esign-sig-name{margin-top:5px;}
.esign-preview .esign-sig-box,.esign-preview .esign-sig-stamp{border:2px dashed var(--c);background:var(--cb);color:var(--c);display:flex;align-items:center;justify-content:center;font-size:9pt;font-weight:700;font-family:${FONT_STACKS.dentera};text-align:center;line-height:1.3;padding:2px;}
.esign-preview .esign-sig-stamp{border-radius:50%;}
`;

/** Extra styles for the editing surface (Tiptap). */
export const EDITOR_CSS = `
.esign-editing .ProseMirror{outline:none;min-height:640px;}
.esign-editing .ProseMirror p.is-editor-empty:first-child{position:relative;}
.esign-editing .ProseMirror p.is-editor-empty:first-child::before{content:attr(data-placeholder);position:absolute;inset-inline-start:0;top:0;color:#9ca3af;pointer-events:none;white-space:nowrap;}
.esign-editing .tableWrapper{overflow-x:auto;}
.esign-editing table td,.esign-editing table th{position:relative;}
.esign-editing table.borderless td,.esign-editing table.borderless th{outline:1px dashed #cbd5e1;outline-offset:-1px;}
.esign-editing .selectedCell::after{content:"";position:absolute;inset:0;background:rgba(12,184,205,0.12);pointer-events:none;}
.esign-editing .column-resize-handle{position:absolute;top:0;bottom:-2px;inset-inline-end:-2px;width:4px;background:#0CB8CD;pointer-events:none;}
.esign-editing.resize-cursor{cursor:col-resize;}
.esign-editing .ProseMirror-selectednode{outline:2px solid #0f172a;outline-offset:2px;border-radius:6px;}
.esign-editing .esign-chip{display:inline-block;border-radius:6px;padding:0 6px;margin:0 1px;font-size:0.92em;line-height:1.5;font-weight:700;white-space:nowrap;cursor:default;}
.esign-editing .esign-pb{display:flex;align-items:center;gap:8px;color:#64748b;font-size:9pt;font-family:${FONT_STACKS.dentera};margin:10px 0;user-select:none;}
.esign-editing .esign-pb::before,.esign-editing .esign-pb::after{content:"";flex:1;border-top:1.5px dashed #94a3b8;}
`;
