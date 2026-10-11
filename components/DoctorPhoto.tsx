import Image from "next/image";
import { BrandRings } from "./BrandRings";

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
            className="absolute inset-0 bg-gradient-to-b from-sand-100 via-primary-50 to-primary-200"
            aria-hidden="true"
          >
            <BrandRings className="absolute -end-[18%] -top-[12%] w-[85%] text-primary-300/60" strokeWidth={2.5} />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary-300/40 to-transparent" />
          </div>
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
