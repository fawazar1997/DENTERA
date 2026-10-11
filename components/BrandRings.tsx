/** SVG arc path around (60,60), from `start` degrees, sweeping `sweep`. */
function arc(r: number, start: number, sweep: number): string {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = 60 + r * Math.cos(rad(start));
  const y1 = 60 + r * Math.sin(rad(start));
  const x2 = 60 + r * Math.cos(rad(start + sweep));
  const y2 = 60 + r * Math.sin(rad(start + sweep));
  const large = sweep > 180 ? 1 : 0;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * The ring motif from the Dentera tooth mark: a dot inside near-closed
 * rings whose small gaps turn around the centre, like the logo's spiral.
 * Purely decorative; inherits the text color.
 */
export function BrandRings({
  className,
  strokeWidth = 3,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="60" cy="60" r="7" fill="currentColor" stroke="none" />
      <path d={arc(18, -40, 315)} />
      <path d={arc(32, 120, 320)} />
      <path d={arc(46, 30, 325)} />
    </svg>
  );
}
