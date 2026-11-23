// A document template's content as HTML, with a copy's values filled in.
// Used for the previews, the page-break measuring and the page images.

import type { DocNode, SignatureBlockAttrs } from "@/lib/esignDoc";
import type { EsignDocSettings, EsignVariable } from "@/lib/esignTypes";
import { autoVarName, displayValue, type ValueLang } from "@/lib/esignValues";
import { FONT_STACKS, MARGIN_X, PAGE_H, SIG_SIZES, contentBox } from "./docStyles";

export type DocStep = { id: string; role: string; color: string; signer?: string };

export type RenderContext = {
  /** "preview": signature boxes outlined in their step's colour, missing values marked; "final": as printed. */
  mode: "preview" | "final";
  settings: EsignDocSettings;
  variables: EsignVariable[];
  /** Values by variable name (stored form). */
  values: Record<string, string>;
  /** The automatic values (approval date, request number, title). */
  auto: { today?: string; ref?: string; title?: string };
  steps: DocStep[];
  /** Labels for the preview boxes. */
  labels?: { signature: string; stamp: string; nameOf: string };
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ltr = (html: string) => `<span dir="ltr" style="unicode-bidi:isolate">${html}</span>`;

export const langOf = (settings: Pick<EsignDocSettings, "dir">): ValueLang => (settings.dir === "ltr" ? "en" : "ar");

function variableText(node: DocNode, ctx: RenderContext): string {
  const a = node.attrs ?? {};
  const lang = langOf(ctx.settings);
  const missing = (label: string) => (ctx.mode === "preview" ? `<span class="esign-missing">[${esc(label)}]</span>` : "");
  if (a.auto === "signer") {
    const step = ctx.steps.find((s) => s.id === a.stepId);
    const name = step?.signer?.trim();
    return name ? esc(name) : missing(`${ctx.labels?.nameOf ?? "اسم"} ${step?.role ?? ""}`.trim());
  }
  if (a.auto === "today" || a.auto === "ref" || a.auto === "title") {
    const value = ctx.auto[a.auto]?.trim();
    if (!value) return missing(autoVarName(a.auto, lang));
    return a.auto === "title" ? esc(value) : ltr(esc(value));
  }
  const name = String(a.name ?? "");
  const variable = ctx.variables.find((v) => v.name === name);
  const raw = variable?.fixed ? variable.default ?? "" : ctx.values[name]?.trim() || variable?.default || "";
  const shown = displayValue(raw, variable ?? "text", lang);
  if (!shown) return missing(name);
  // Dates and plain numbers read left to right inside Arabic text (23-11-2026, not 2026-11-23).
  return variable?.type === "date" || variable?.type === "number" ? ltr(esc(shown)) : esc(shown);
}

function inline(nodes: DocNode[] | undefined, ctx: RenderContext): string {
  return (nodes ?? [])
    .map((n) => {
      if (n.type === "hardBreak") return "<br/>";
      if (n.type === "variable") return variableText(n, ctx);
      if (n.type !== "text") return "";
      let html = esc(n.text ?? "");
      for (const m of n.marks ?? []) {
        if (m.type === "bold") html = `<strong>${html}</strong>`;
        else if (m.type === "italic") html = `<em>${html}</em>`;
        else if (m.type === "underline") html = `<u>${html}</u>`;
      }
      return html;
    })
    .join("");
}

const alignStyle = (node: DocNode) => {
  const a = node.attrs?.textAlign;
  return a === "left" || a === "right" || a === "center" || a === "justify" ? ` style="text-align:${a}"` : "";
};

function signatureBlock(node: DocNode, ctx: RenderContext): string {
  const a = node.attrs as unknown as SignatureBlockAttrs;
  const step = ctx.steps.find((s) => s.id === a.stepId);
  const size = SIG_SIZES[a.size] ?? SIG_SIZES.m;
  const color = step?.color ?? "#64748b";
  const preview = ctx.mode === "preview";
  const role = step?.role ?? "";
  const name = step?.signer?.trim();
  const box = `<div class="esign-sig-box" data-field="signature" data-step="${esc(a.stepId)}" style="height:${size.h}px">${
    preview ? esc(`${ctx.labels?.signature ?? "توقيع"}: ${name || role}`) : ""
  }</div>`;
  const stamp = a.stamp
    ? `<div class="esign-sig-stamp" data-field="stamp" data-step="${esc(a.stepId)}" style="width:${size.stamp}px;height:${size.stamp}px">${
        preview ? esc(ctx.labels?.stamp ?? "ختم") : ""
      }</div>`
    : "";
  const nameLine = a.showName
    ? `<div class="esign-sig-name">${name ? esc(name) : preview ? `<span class="esign-missing">[${esc(`${ctx.labels?.nameOf ?? "اسم"} ${role}`)}]</span>` : ""}</div>`
    : "";
  return `<div class="esign-sig esign-al-${a.align}" data-sig="${esc(a.stepId)}" style="width:${size.w}px;--c:${color};--cb:${color}14">${
    a.showRole && role ? `<div class="esign-sig-role">${esc(role)}</div>` : ""
  }<div class="esign-sig-row">${box}${stamp}</div>${nameLine}</div>`;
}

function table(node: DocNode, ctx: RenderContext): string {
  const rows = node.content ?? [];
  // Column widths from the first row (set by dragging in the editor), as shares of the width.
  const first = rows[0]?.content ?? [];
  const widths: number[] = [];
  let known = true;
  for (const cell of first) {
    const span = Number(cell.attrs?.colspan) || 1;
    const cw = cell.attrs?.colwidth as number[] | null | undefined;
    for (let i = 0; i < span; i++) {
      const w = cw?.[i];
      if (!w) known = false;
      widths.push(w ?? 0);
    }
  }
  const total = widths.reduce((s, w) => s + w, 0);
  const cols =
    known && total > 0
      ? `<colgroup>${widths.map((w) => `<col style="width:${((w / total) * 100).toFixed(2)}%"/>`).join("")}</colgroup>`
      : "";
  const body = rows
    .map(
      (row) =>
        `<tr>${(row.content ?? [])
          .map((cell) => {
            const tag = cell.type === "tableHeader" ? "th" : "td";
            const span = Number(cell.attrs?.colspan) > 1 ? ` colspan="${Number(cell.attrs?.colspan)}"` : "";
            const rspan = Number(cell.attrs?.rowspan) > 1 ? ` rowspan="${Number(cell.attrs?.rowspan)}"` : "";
            return `<${tag}${span}${rspan}>${blocks(cell.content, ctx)}</${tag}>`;
          })
          .join("")}</tr>`
    )
    .join("");
  return `<table${node.attrs?.borderless ? ' class="borderless"' : ""}>${cols}<tbody>${body}</tbody></table>`;
}

function blocks(nodes: DocNode[] | undefined, ctx: RenderContext): string {
  return (nodes ?? [])
    .map((n) => {
      switch (n.type) {
        case "paragraph":
          return `<p${alignStyle(n)}>${inline(n.content, ctx)}</p>`;
        case "heading": {
          const level = [1, 2, 3].includes(Number(n.attrs?.level)) ? Number(n.attrs?.level) : 2;
          return `<h${level}${alignStyle(n)}>${inline(n.content, ctx)}</h${level}>`;
        }
        case "bulletList":
          return `<ul>${(n.content ?? []).map((li) => `<li>${blocks(li.content, ctx)}</li>`).join("")}</ul>`;
        case "orderedList": {
          const start = Number(n.attrs?.start) > 1 ? ` start="${Number(n.attrs?.start)}"` : "";
          return `<ol${start}>${(n.content ?? []).map((li) => `<li>${blocks(li.content, ctx)}</li>`).join("")}</ol>`;
        }
        case "table":
          return table(n, ctx);
        case "horizontalRule":
          return "<hr/>";
        case "pageBreak":
          return '<div class="esign-pagebreak" data-pagebreak="1"></div>';
        case "signatureBlock":
          return signatureBlock(n, ctx);
        default:
          return "";
      }
    })
    .join("");
}

/** The document's body (the flowing text, before it is cut into pages). */
export function documentBodyHtml(doc: DocNode, ctx: RenderContext): string {
  const s = ctx.settings;
  return `<div class="esign-doc${ctx.mode === "preview" ? " esign-preview" : ""}" dir="${s.dir}" style="font-family:${FONT_STACKS[s.font]};font-size:${s.size}pt">${blocks(
    doc.content,
    ctx
  )}</div>`;
}

export type PageSlice = { start: number; end: number };

/**
 * One A4 page: the letterhead (if on), the slice of the body that falls on
 * it, and the footer with the page number.
 */
export function pageHtml(input: {
  body: string;
  slice: PageSlice;
  index: number;
  count: number;
  settings: EsignDocSettings;
  footer: string;
  logoUrl: string;
  pageLabel: { page: string; of: string };
}): string {
  const { settings, slice } = input;
  const box = contentBox(settings);
  const dir = settings.dir;
  const head = settings.letterhead
    ? `<div class="esign-head" dir="${dir}"><img src="${esc(input.logoUrl)}" alt="Dentera"/><div class="esign-head-meta"></div></div>`
    : "";
  const number = `${input.pageLabel.page} ${input.index + 1} ${input.pageLabel.of} ${input.count}`;
  const foot = settings.letterhead
    ? `<div class="esign-foot" dir="${dir}"><span class="esign-foot-line">${esc(input.footer)}</span><span>${esc(number)}</span></div>`
    : input.count > 1
      ? `<div style="position:absolute;bottom:30px;left:0;right:0;text-align:center;font-family:${FONT_STACKS.dentera};font-size:8pt;color:#6b7280">${esc(number)}</div>`
      : "";
  const height = Math.max(0, slice.end - slice.start);
  return `<div class="esign-page" dir="${dir}">${head}<div class="esign-viewport" style="top:${box.top}px;height:${Math.min(height, PAGE_H)}px"><div style="transform:translateY(-${slice.start}px)">${input.body}</div></div>${foot}</div>`;
}

export { MARGIN_X };
