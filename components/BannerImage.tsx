/**
 * A full-bleed banner photo that fills its (relatively positioned) parent.
 * With a phone version, screens narrower than 640px get that image instead
 * of cropping the wide one; each device downloads only the one it shows.
 */
export function BannerImage({
  src,
  mobileSrc,
  priority = false,
  className = "",
}: {
  src: string;
  mobileSrc?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <picture>
      {mobileSrc && <source media="(max-width: 639px)" srcSet={mobileSrc} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={`absolute inset-0 h-full w-full object-cover ${className}`}
      />
    </picture>
  );
}
