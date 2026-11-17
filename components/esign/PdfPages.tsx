"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

// Shows a PDF's pages one under the other at the container's width (pdf.js,
// loaded only in the browser), with anything laid over each page in 0–1
// page coordinates: boxes in the template editor, values in a preview, the
// signer's boxes on the signing page.

type PdfJs = typeof import("pdfjs-dist");
type PdfDoc = Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;

let pdfjsPromise: Promise<PdfJs> | null = null;

function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString();
    return pdfjs;
  });
  return pdfjsPromise;
}

/** Reads a PDF's page sizes (PDF points), e.g. before uploading a template. */
export async function pdfPageSizes(data: ArrayBuffer): Promise<{ w: number; h: number }[]> {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) }).promise;
  const sizes: { w: number; h: number }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    sizes.push({ w: viewport.width, h: viewport.height });
  }
  await doc.destroy();
  return sizes;
}

export function PdfPages({
  url,
  data,
  overlay,
  onLoaded,
  labels,
  className = "",
}: {
  /** Where to load the PDF from (same site), or… */
  url?: string;
  /** …its bytes. */
  data?: ArrayBuffer;
  /** Laid over page `index`; positioned children use percentages of the page. */
  overlay?: (index: number) => ReactNode;
  onLoaded?: (pages: { w: number; h: number }[]) => void;
  labels: { loading: string; failed: string; page: string };
  className?: string;
}) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [sizes, setSizes] = useState<{ w: number; h: number }[]>([]);
  const [error, setError] = useState(false);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    let cancelled = false;
    let loaded: PdfDoc | null = null;
    setDoc(null);
    setError(false);
    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const source = data ? { data: new Uint8Array(data.slice(0)) } : { url: url!, withCredentials: true };
        // Draw the PDF's own glyph shapes rather than handing its fonts to
        // the browser, which would shape Arabic a second time and break it.
        loaded = await pdfjs.getDocument({ ...source, disableFontFace: true, useSystemFonts: false }).promise;
        const list: { w: number; h: number }[] = [];
        for (let i = 1; i <= loaded.numPages; i++) {
          const viewport = (await loaded.getPage(i)).getViewport({ scale: 1 });
          list.push({ w: viewport.width, h: viewport.height });
        }
        if (cancelled) return;
        setSizes(list);
        setDoc(loaded);
        onLoadedRef.current?.(list);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [url, data]);

  if (error) return <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{labels.failed}</p>;
  if (!doc)
    return (
      <p className="flex items-center justify-center gap-2 rounded-xl bg-white p-10 text-sm text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" /> {labels.loading}
      </p>
    );

  return (
    <div className={`space-y-4 ${className}`}>
      {sizes.map((size, i) => (
        <PdfPage key={i} doc={doc} index={i} size={size} label={`${labels.page} ${i + 1}`}>
          {overlay?.(i)}
        </PdfPage>
      ))}
    </div>
  );
}

function PdfPage({
  doc,
  index,
  size,
  label,
  children,
}: {
  doc: PdfDoc;
  index: number;
  size: { w: number; h: number };
  label: string;
  children?: ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(Math.round(el.clientWidth)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!width || !canvas.current) return;
    let task: { cancel: () => void; promise: Promise<unknown> } | null = null;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(index + 1);
      if (cancelled || !canvas.current) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2.5);
      const viewport = page.getViewport({ scale: (width / size.w) * ratio });
      const el = canvas.current;
      el.width = Math.round(viewport.width);
      el.height = Math.round(viewport.height);
      task = page.render({ canvasContext: el.getContext("2d")!, viewport });
      await task.promise.catch(() => undefined);
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, index, size.w, width]);

  return (
    <div
      ref={wrap}
      aria-label={label}
      className="relative w-full overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-ink-200"
      style={{ aspectRatio: `${size.w} / ${size.h}` }}
    >
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

/** Style for a box laid over a page, from its 0–1 coordinates. */
export function boxStyle(box: { x: number; y: number; w: number; h: number }): React.CSSProperties {
  return {
    position: "absolute",
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.w * 100}%`,
    height: `${box.h * 100}%`,
  };
}
