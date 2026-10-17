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
        <>
          {/* Brand backdrop: shows through cut-out (transparent) photos;
              ordinary photos simply cover it. */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-sand-50 via-sand-100 to-primary-100"
            aria-hidden="true"
          />
          <Image
            src={photoUrl}
            alt={name}
            fill
            sizes={sizes}
            priority={priority}
            // Served as uploaded (already sized at upload) — no re-compression.
            unoptimized
            className={`object-cover object-[50%_62%] ${zoom}`}
          />
        </>
      ) : (
        <div
          role="img"
          aria-label={name}
          className={`absolute inset-0 bg-gradient-to-br from-ink-900 via-ink-900 to-primary-800 ${zoom}`}
        >
          <div
            className="absolute inset-0 bg-brand-pattern bg-primary-400 opacity-20 [--pattern-size:130px]"
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
          {/* Vector mark: stays sharp at any size. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/dentera-mark.svg"
            alt=""
            className="absolute inset-0 m-auto h-[46%] w-auto opacity-90"
          />
        </div>
      )}
    </div>
  );
}
