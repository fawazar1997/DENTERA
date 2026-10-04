import Image from "next/image";
import { Logo } from "./Logo";

/**
 * Full-width banner at the top of the home page. Shows the image uploaded
 * from the control panel (Site Settings); until one is uploaded, a branded
 * banner in the identity colors keeps the slot in place.
 */
export function HomeBanner({
  bannerUrl,
  tagline,
}: {
  bannerUrl?: string;
  tagline: string;
}) {
  if (bannerUrl) {
    return (
      <div className="relative h-56 w-full overflow-hidden bg-ink-100 sm:h-72 lg:h-[28rem]">
        <Image
          src={bannerUrl}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-56 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-ink-900 to-ink-950 sm:h-72 lg:h-[28rem]">
      <div
        className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,#0cb8cd_1px,transparent_0)] [background-size:22px_22px]"
        aria-hidden="true"
      />
      <div
        className="absolute -top-24 start-1/4 h-72 w-72 rounded-full bg-primary-500/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 end-1/4 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex animate-fade-up flex-col items-center gap-5 px-6 text-center opacity-0">
        <Logo className="h-16 w-auto sm:h-20 lg:h-24" priority />
        <p className="max-w-xl text-base text-sand-200 sm:text-lg">{tagline}</p>
      </div>
    </div>
  );
}
