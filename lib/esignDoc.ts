// A document template's content: the editor's (Tiptap) JSON, limited to what
// the platform can print. Shared by the editor, the renderer and the server,
// which cleans every saved document with sanitizeDocContent.

import type { EsignAutoVar } from "./esignTypes";

export type DocMark = { type: "bold" | "italic" | "underline" };

export type DocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: DocMark[];
};

export type SignatureBlockAttrs = {
  stepId: string;
  /** The signer's name printed under the signature. */
  showName: boolean;
  /** The role (e.g. الطبيب) printed above it. */
  showRole: boolean;
  /** The clinic stamp beside it, once this step has signed. */
  stamp: boolean;
  size: "s" | "m" | "l";
  align: "start" | "center" | "end";
};

export type VariableAttrs = {
  /** A template variable's name, or for an automatic one its display name. */
  name: string;
  auto?: EsignAutoVar | "signer";
  /** auto "signer": whose name. */
  stepId?: string;
};

export const EMPTY_DOC: DocNode = { type: "doc", content: [{ type: "paragraph" }] };

const ALIGN = new Set(["left", "center", "right", "justify"]);
const BLOCKS = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "table",
  "horizontalRule",
  "signatureBlock",
  "pageBreak",
]);
const MARKS = new Set(["bold", "italic", "underline"]);
const AUTO = new Set(["today", "ref", "title", "signer"]);

const MAX_NODES = 20000;
const MAX_TEXT = 20000;

const cleanText = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, max);
const cleanName = (v: unknown) => cleanText(v, 60).replace(/[{}]/g, "").replace(/\s+/g, " ").trim();

/** A saved document cleaned to the allowed nodes and attributes (null if it isn't one). */
export function sanitizeDocContent(input: unknown): DocNode | null {
  let count = 0;

  function inline(node: DocNode): DocNode | null {
    if (node.type === "text") {
      const text = cleanText(node.text, MAX_TEXT);
      if (!text) return null;
      const marks = (Array.isArray(node.marks) ? node.marks : [])
        .filter((m) => m && MARKS.has(m.type))
        .map((m) => ({ type: m.type }));
      return marks.length ? { type: "text", text, marks } : { type: "text", text };
    }
    if (node.type === "hardBreak") return { type: "hardBreak" };
    if (node.type === "variable") {
      const a = node.attrs ?? {};
      const name = cleanName(a.name);
      const auto = AUTO.has(String(a.auto)) ? (String(a.auto) as VariableAttrs["auto"]) : undefined;
      if (!name && !auto) return null;
      const attrs: Record<string, unknown> = { name, auto: auto ?? null, stepId: null };
      if (auto === "signer") attrs.stepId = cleanText(a.stepId, 40) || null;
      return { type: "variable", attrs };
    }
    return null;
  }

  function inlines(list: unknown): DocNode[] {
    return (Array.isArray(list) ? list : []).flatMap((n) => {
      if (++count > MAX_NODES || !n || typeof n !== "object") return [];
      const out = inline(n as DocNode);
      return out ? [out] : [];
    });
  }

  const alignOf = (a?: Record<string, unknown>) => (ALIGN.has(String(a?.textAlign)) ? String(a?.textAlign) : null);

  function blocks(list: unknown, depth: number, allowed = BLOCKS): DocNode[] {
    if (depth > 30) return [];
    return (Array.isArray(list) ? list : []).flatMap((n) => {
      if (++count > MAX_NODES || !n || typeof n !== "object") return [];
      const out = block(n as DocNode, depth, allowed);
      return out ? [out] : [];
    });
  }

  function block(node: DocNode, depth: number, allowed: Set<string>): DocNode | null {
    if (!allowed.has(node.type)) return null;
    const a = node.attrs ?? {};
    switch (node.type) {
      case "paragraph": {
        const content = inlines(node.content);
        return { type: "paragraph", attrs: { textAlign: alignOf(a) }, ...(content.length ? { content } : {}) };
      }
      case "heading": {
        const level = [1, 2, 3].includes(Number(a.level)) ? Number(a.level) : 2;
        const content = inlines(node.content);
        return { type: "heading", attrs: { level, textAlign: alignOf(a) }, ...(content.length ? { content } : {}) };
      }
      case "bulletList":
      case "orderedList": {
        const items = (Array.isArray(node.content) ? node.content : []).flatMap((item) => {
          if (++count > MAX_NODES || item?.type !== "listItem") return [];
          const content = blocks(item.content, depth + 1, new Set(["paragraph", "bulletList", "orderedList"]));
          return content.length ? [{ type: "listItem", content }] : [];
        });
        if (!items.length) return null;
        const attrs = node.type === "orderedList" ? { start: Math.max(1, Math.min(999, Math.floor(Number(a.start) || 1))) } : undefined;
        return { type: node.type, ...(attrs ? { attrs } : {}), content: items };
      }
      case "table": {
        const rows = (Array.isArray(node.content) ? node.content : []).slice(0, 300).flatMap((row) => {
          if (++count > MAX_NODES || row?.type !== "tableRow") return [];
          const cells = (Array.isArray(row.content) ? row.content : []).slice(0, 12).flatMap((cell) => {
            if (++count > MAX_NODES || (cell?.type !== "tableCell" && cell?.type !== "tableHeader")) return [];
            const ca = cell.attrs ?? {};
            const content = blocks(cell.content, depth + 1, new Set(["paragraph", "heading", "bulletList", "orderedList", "signatureBlock"]));
            const colwidth = Array.isArray(ca.colwidth) ? ca.colwidth.slice(0, 12).map((w: unknown) => Math.max(20, Math.min(2000, Math.round(Number(w) || 0)))) : null;
            return [
              {
                type: cell.type,
                attrs: {
                  colspan: Math.max(1, Math.min(12, Math.floor(Number(ca.colspan) || 1))),
                  rowspan: Math.max(1, Math.min(50, Math.floor(Number(ca.rowspan) || 1))),
                  colwidth,
                },
                content: content.length ? content : [{ type: "paragraph" }],
              },
            ];
          });
          return cells.length ? [{ type: "tableRow", content: cells }] : [];
        });
        if (!rows.length) return null;
        return { type: "table", attrs: { borderless: a.borderless === true }, content: rows };
      }
      case "horizontalRule":
        return { type: "horizontalRule" };
      case "pageBreak":
        return { type: "pageBreak" };
      case "signatureBlock": {
        const stepId = cleanText(a.stepId, 40);
        if (!stepId) return null;
        const attrs: SignatureBlockAttrs = {
          stepId,
          showName: a.showName !== false,
          showRole: a.showRole !== false,
          stamp: a.stamp === true,
          size: a.size === "s" || a.size === "l" ? a.size : "m",
          align: a.align === "center" || a.align === "end" ? a.align : "start",
        };
        return { type: "signatureBlock", attrs };
      }
    }
    return null;
  }

  if (!input || typeof input !== "object" || (input as DocNode).type !== "doc") return null;
  const content = blocks((input as DocNode).content, 0);
  if (count > MAX_NODES) return null;
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

/** Visits every node. */
export function walkDoc(node: DocNode, visit: (n: DocNode) => void) {
  visit(node);
  for (const child of node.content ?? []) walkDoc(child, visit);
}

/** The template variables a document uses (not the automatic ones), in order. */
export function docVariableNames(doc: DocNode): string[] {
  const names: string[] = [];
  walkDoc(doc, (n) => {
    if (n.type === "variable" && !n.attrs?.auto) {
      const name = String(n.attrs?.name ?? "");
      if (name && !names.includes(name)) names.push(name);
    }
  });
  return names;
}

/** The steps a document has a signature block for. */
export function docSignatureSteps(doc: DocNode): string[] {
  const steps: string[] = [];
  walkDoc(doc, (n) => {
    if (n.type === "signatureBlock") {
      const id = String(n.attrs?.stepId ?? "");
      if (id && !steps.includes(id)) steps.push(id);
    }
  });
  return steps;
}

/** Steps referenced by blocks or signer-name chips. */
export function docStepRefs(doc: DocNode): string[] {
  const steps: string[] = [];
  walkDoc(doc, (n) => {
    const id = n.type === "signatureBlock" || (n.type === "variable" && n.attrs?.auto === "signer") ? String(n.attrs?.stepId ?? "") : "";
    if (id && !steps.includes(id)) steps.push(id);
  });
  return steps;
}
