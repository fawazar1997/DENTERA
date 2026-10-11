"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

/** Photos narrower than this look soft on large cards and phone screens. */
const MIN_WIDTH = 800;

/**
 * Loads a photo in the browser and, if it's too small to look sharp on
 * the website, shows a warning with its actual size so it can be replaced.
 */
export function PhotoQualityBadge({
  src,
  label,
}: {
  src?: string;
  label: string;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  if (!size || size.w >= MIN_WIDTH) return null;
  return (
    <span
      title={`${size.w}×${size.h}px`}
      className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-bold text-ink-800"
    >
      <AlertTriangle className="h-3 w-3" />
      {label} ({size.w}×{size.h})
    </span>
  );
}
