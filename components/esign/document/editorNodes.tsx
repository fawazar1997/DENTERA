"use client";

// The editor's own pieces (Tiptap): variable chips, signature blocks, page
// breaks, and tables that can hide their borders.

import { createContext, useContext } from "react";
import { InputRule, Node, PasteRule } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import Table from "@tiptap/extension-table";
import { PenLine } from "lucide-react";
import type { EsignText } from "@/lib/esignText";
import { autoVarName, type ValueLang } from "@/lib/esignValues";
import { SIG_SIZES } from "./docStyles";

export type EditorInfo = {
  steps: { id: string; role: string; color: string }[];
  t: EsignText;
  lang: ValueLang;
};

export const EditorInfoContext = createContext<EditorInfo | null>(null);

const VAR_COLOR = "#0e7490";
const AUTO_COLOR = "#7c3aed";

/** A chip's label and colour. */
export function chipLook(attrs: Record<string, unknown>, info: EditorInfo | null): { label: string; color: string } {
  if (attrs.auto === "signer") {
    const step = info?.steps.find((s) => s.id === attrs.stepId);
    return { label: `${info?.t.nameOfRole ?? "اسم"} ${step?.role || "…"}`, color: step?.color ?? AUTO_COLOR };
  }
  if (attrs.auto === "today" || attrs.auto === "ref" || attrs.auto === "title") {
    return { label: autoVarName(attrs.auto, info?.lang ?? "ar"), color: AUTO_COLOR };
  }
  return { label: String(attrs.name ?? ""), color: VAR_COLOR };
}

function VariableView({ node }: NodeViewProps) {
  const info = useContext(EditorInfoContext);
  const { label, color } = chipLook(node.attrs, info);
  return (
    <NodeViewWrapper as="span" className="esign-chip" style={{ background: `${color}1f`, color, boxShadow: `inset 0 0 0 1px ${color}55` }}>
      {label}
    </NodeViewWrapper>
  );
}

const VAR_RE = "\\{\\{([^{}\\n]{1,60})\\}\\}";

export const VariableNode = Node.create({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { name: { default: "" }, auto: { default: null }, stepId: { default: null } };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-variable]",
        getAttrs: (el) => ({
          name: (el as HTMLElement).getAttribute("data-variable") ?? "",
          auto: (el as HTMLElement).getAttribute("data-auto") || null,
          stepId: (el as HTMLElement).getAttribute("data-step") || null,
        }),
      },
    ];
  },
  renderHTML({ node }) {
    const attrs: Record<string, string> = { "data-variable": String(node.attrs.name ?? "") };
    if (node.attrs.auto) attrs["data-auto"] = String(node.attrs.auto);
    if (node.attrs.stepId) attrs["data-step"] = String(node.attrs.stepId);
    return ["span", attrs, `{{${node.attrs.name || node.attrs.auto}}}`];
  },
  renderText({ node }) {
    return `{{${node.attrs.name || node.attrs.auto}}}`;
  },
  addNodeView() {
    return ReactNodeViewRenderer(VariableView);
  },
  // Typing or pasting {{الراتب}} becomes a chip (the braces included).
  addInputRules() {
    return [
      new InputRule({
        find: new RegExp(`${VAR_RE}$`),
        handler: ({ state, range, match }) => {
          state.tr.replaceWith(range.from, range.to, this.type.create({ name: match[1].trim() }));
        },
      }),
    ];
  },
  addPasteRules() {
    return [
      new PasteRule({
        find: new RegExp(VAR_RE, "g"),
        handler: ({ state, range, match }) => {
          state.tr.replaceWith(range.from, range.to, this.type.create({ name: String(match[1]).trim() }));
        },
      }),
    ];
  },
});

function SignatureView({ node, selected }: NodeViewProps) {
  const info = useContext(EditorInfoContext);
  const a = node.attrs;
  const step = info?.steps.find((s) => s.id === a.stepId);
  const color = step?.color ?? "#64748b";
  const size = SIG_SIZES[a.size as keyof typeof SIG_SIZES] ?? SIG_SIZES.m;
  const margin =
    a.align === "center" ? { marginInline: "auto" } : a.align === "end" ? { marginInlineStart: "auto" } : { marginInlineEnd: "auto" };
  return (
    <NodeViewWrapper
      data-drag-handle=""
      className="esign-sig"
      style={{ width: size.w, maxWidth: "100%", ...margin, alignItems: a.align === "center" ? "center" : undefined, cursor: "grab" }}
    >
      {a.showRole && <div className="esign-sig-role" style={{ color }}>{step?.role || "…"}</div>}
      <div className="esign-sig-row" style={{ width: "100%" }}>
        <div
          className="esign-sig-box"
          style={{
            height: size.h,
            border: `2px dashed ${color}`,
            background: `${color}14`,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: "9pt",
            fontWeight: 700,
            borderRadius: 6,
            outline: selected ? "2px solid #0f172a" : undefined,
            outlineOffset: 2,
          }}
        >
          <PenLine style={{ width: 16, height: 16 }} />
          {info?.t.sigStep ?? "توقيع"}: {step?.role || "…"}
        </div>
        {a.stamp && (
          <div
            className="esign-sig-stamp"
            style={{
              width: size.stamp * 0.8,
              height: size.stamp * 0.8,
              border: `2px dashed ${color}`,
              borderRadius: "50%",
              color,
              fontSize: "8pt",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffffcc",
            }}
          >
            {info?.t.stampOf ?? "ختم"}
          </div>
        )}
      </div>
      {a.showName && (
        <div className="esign-sig-name" style={{ color: "#64748b" }}>
          [{info?.t.nameOfRole ?? "اسم"} {step?.role || "…"}]
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const SignatureBlockNode = Node.create({
  name: "signatureBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      stepId: { default: "" },
      showName: { default: true },
      showRole: { default: true },
      stamp: { default: false },
      size: { default: "m" },
      align: { default: "start" },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-signature-block]",
        getAttrs: (el) => {
          try {
            return JSON.parse((el as HTMLElement).getAttribute("data-signature-block") ?? "{}");
          } catch {
            return false;
          }
        },
      },
    ];
  },
  renderHTML({ node }) {
    return ["div", { "data-signature-block": JSON.stringify(node.attrs) }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(SignatureView);
  },
});

export const PageBreakNode = Node.create<{ label: string }>({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  addOptions() {
    return { label: "Page break" };
  },
  parseHTML() {
    return [{ tag: "div[data-page-break]" }, { tag: 'br[style*="page-break-before"]' }];
  },
  renderHTML() {
    return ["div", { "data-page-break": "1", class: "esign-pb" }, this.options.label];
  },
});

/** Tables, with an option to hide their borders (e.g. a row of signatures). */
export const DocTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      borderless: {
        default: false,
        parseHTML: (el: HTMLElement) => el.classList.contains("borderless"),
        renderHTML: (attrs: Record<string, unknown>) => (attrs.borderless ? { class: "borderless" } : {}),
      },
    };
  },
});
