import Image from "next/image";

/**
 * A doctor's portrait in a rounded rectangle. Fills its container, so
 * size it with the parent (e.g. "aspect-[4/5] w-full"). Without an
 * uploaded photo it shows the Dentera tooth mark on a navy brand panel.
 */
export function DoctorPhoto({
  photoUrl,
  name,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
  className = "",
  zoomOnHover = false,
}: {
  photoUrl?: string;
  name: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  zoomOnHover?: boolean;
}) {
  const zoom = zoomOnHover
    ? "transition duration-500 ease-out group-hover:scale-105"
    : "";

  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={name}
          fill
          sizes={sizes}
          priority={priority}
          className={`object-cover object-top ${zoom}`}
        />
      ) : (
        <div
          role="img"
          aria-label={name}
          className={`absolute inset-0 bg-gradient-to-br from-ink-900 via-ink-900 to-primary-800 ${zoom}`}
        >
          <div
            className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,#0cb8cd_1px,transparent_0)] [background-size:16px_16px]"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-1/4 -end-1/4 h-3/4 w-3/4 rounded-full bg-primary-500/30 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute -start-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-accent-500/20 blur-3xl"
            aria-hidden="true"
          />
          <Image
            src="/brand/dentera-icon.png"
            alt=""
            fill
            sizes="200px"
            className="object-contain p-[12%] opacity-90"
          />
        </div>
      )}
    </div>
  );
}
