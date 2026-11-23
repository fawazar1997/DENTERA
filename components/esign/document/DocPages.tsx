"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { EsignDocSettings } from "@/lib/esignTypes";
import { PAGE_H, PAGE_W } from "./docStyles";
import { LOGO_PATH, measureDocument, type DocLayout } from "./layout";
import { pageHtml } from "./renderDocument";

/**
 * A document's A4 pages on screen, cut exactly as they will be made (same
 * styles, same page breaks), scaled to the available width.
 */
export function DocPages({
  body,
  settings,
  footer,
  labels,
  onLayout,
}: {
  /** The body's HTML (documentBodyHtml). */
  body: string;
  settings: EsignDocSettings;
  footer: string;
  labels: { page: string; of: string; measuring: string };
  onLayout?: (layout: DocLayout) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [layout, setLayout] = useState<DocLayout | null>(null);
  const report = useRef(onLayout);
  report.current = onLayout;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      measureDocument(body, settings)
        .then((l) => {
          if (!alive) return;
          setLayout(l);
          report.current?.(l);
        })
        .catch(() => undefined);
    }, 200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, settings.letterhead, settings.dir, settings.font, settings.size]);

  const scale = width ? Math.min(1, width / PAGE_W) : 0;

  return (
    <div ref={box} className="w-full">
      {!layout || !scale ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm text-ink-500">
          <Loader2 className="h-4 w-4 animate-spin" /> {labels.measuring}
        </p>
      ) : (
        <div className="space-y-4">
          {layout.pages.map((slice, i) => (
            <div
              key={i}
              className="relative mx-auto overflow-hidden rounded-md bg-white shadow-md ring-1 ring-ink-200"
              style={{ width: PAGE_W * scale, height: PAGE_H * scale }}
            >
              <div
                className="absolute left-0 top-0"
                style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: "top left" }}
                dangerouslySetInnerHTML={{
                  __html: pageHtml({
                    body,
                    slice,
                    index: i,
                    count: layout.pages.length,
                    settings,
                    footer,
                    logoUrl: LOGO_PATH,
                    pageLabel: { page: labels.page, of: labels.of },
                  }),
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
