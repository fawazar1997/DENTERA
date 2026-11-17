"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Eraser } from "lucide-react";

// A pad to draw a signature with the mouse, a pen or a finger. The result
// is a transparent PNG cropped to the drawing.

export type SignaturePadHandle = {
  /** The drawing as a PNG data URL (null when nothing was drawn). */
  toPng: () => string | null;
  clear: () => void;
};

const INK = "#0b1a5c";

export const SignaturePad = forwardRef<SignaturePadHandle, { labels: { hint: string; clear: string }; onChange?: (drawn: boolean) => void }>(
  function SignaturePad({ labels, onChange }, ref) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const strokes = useRef<{ x: number; y: number }[][]>([]);
    const drawing = useRef(false);
    const [drawn, setDrawn] = useState(false);

    function setHasDrawing(value: boolean) {
      setDrawn(value);
      onChange?.(value);
    }

    // Size the canvas to its box (sharp on high-density screens) and redraw.
    useEffect(() => {
      const el = canvas.current;
      if (!el) return;
      const resize = () => {
        const ratio = window.devicePixelRatio || 1;
        el.width = Math.round(el.clientWidth * ratio);
        el.height = Math.round(el.clientHeight * ratio);
        redraw();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(el);
      return () => observer.disconnect();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function redraw() {
      const el = canvas.current;
      if (!el) return;
      const ctx = el.getContext("2d")!;
      ctx.clearRect(0, 0, el.width, el.height);
      const ratio = el.width / Math.max(1, el.clientWidth);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6 * ratio;
      for (const stroke of strokes.current) {
        ctx.beginPath();
        stroke.forEach((p, i) => {
          const x = p.x * el.width;
          const y = p.y * el.height;
          if (i === 0) ctx.moveTo(x, y);
          else {
            // Smooth: curve through the midpoints.
            const prev = stroke[i - 1];
            const mx = ((prev.x + p.x) / 2) * el.width;
            const my = ((prev.y + p.y) / 2) * el.height;
            ctx.quadraticCurveTo(prev.x * el.width, prev.y * el.height, mx, my);
          }
        });
        if (stroke.length === 1) {
          const p = stroke[0];
          ctx.lineTo(p.x * el.width + 0.1, p.y * el.height + 0.1);
        }
        ctx.stroke();
      }
    }

    function point(e: React.PointerEvent<HTMLCanvasElement>) {
      const rect = e.currentTarget.getBoundingClientRect();
      return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
    }

    useImperativeHandle(ref, () => ({
      clear() {
        strokes.current = [];
        redraw();
        setHasDrawing(false);
      },
      toPng() {
        const el = canvas.current;
        if (!el || !strokes.current.length) return null;
        // Crop to the drawing, with a small margin.
        const ctx = el.getContext("2d")!;
        const { data, width, height } = ctx.getImageData(0, 0, el.width, el.height);
        let minX = width, minY = height, maxX = -1, maxY = -1;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 10) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < 0) return null;
        const margin = Math.round(6 * (el.width / el.clientWidth));
        minX = Math.max(0, minX - margin);
        minY = Math.max(0, minY - margin);
        maxX = Math.min(width - 1, maxX + margin);
        maxY = Math.min(height - 1, maxY + margin);
        const out = document.createElement("canvas");
        // At most 900px wide: sharp in print, small to send.
        const scale = Math.min(1, 900 / (maxX - minX + 1));
        out.width = Math.max(1, Math.round((maxX - minX + 1) * scale));
        out.height = Math.max(1, Math.round((maxY - minY + 1) * scale));
        out.getContext("2d")!.drawImage(el, minX, minY, maxX - minX + 1, maxY - minY + 1, 0, 0, out.width, out.height);
        return out.toDataURL("image/png");
      },
    }));

    return (
      <div>
        <div className="relative">
          <canvas
            ref={canvas}
            className="h-48 w-full touch-none rounded-xl border-2 border-dashed border-primary-300 bg-white sm:h-56"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drawing.current = true;
              strokes.current.push([point(e)]);
              redraw();
              if (!drawn) setHasDrawing(true);
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              strokes.current[strokes.current.length - 1].push(point(e));
              redraw();
            }}
            onPointerUp={() => (drawing.current = false)}
            onPointerCancel={() => (drawing.current = false)}
          />
          {!drawn && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink-400">
              {labels.hint}
            </span>
          )}
          <span className="pointer-events-none absolute inset-x-8 bottom-10 border-b border-ink-200" aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={() => {
            strokes.current = [];
            redraw();
            setHasDrawing(false);
          }}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-ink-600 hover:text-ink-900"
        >
          <Eraser className="h-4 w-4" />
          {labels.clear}
        </button>
      </div>
    );
  }
);
