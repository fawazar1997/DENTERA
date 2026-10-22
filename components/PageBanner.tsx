import { BannerImage } from "./BannerImage";

/**
 * Title banner at the top of the inner pages. With an image uploaded in
 * Control Panel → Banners it shows the photo under a navy overlay;
 * otherwise a soft branded gradient.
 */
export function PageBanner({
  title,
  subtitle,
  imageUrl,
  mobileImageUrl,
}: {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  /** Optional phone version, shown below 640px. */
  mobileImageUrl?: string;
}) {
  const desktop = imageUrl ?? mobileImageUrl;
  if (desktop) {
    return (
      <section
        className={`relative isolate flex min-h-[18rem] items-center overflow-hidden sm:min-h-[22rem] lg:min-h-[26rem] ${
          // A phone version is square (1080 × 1080): show it whole on phones.
          mobileImageUrl ? "max-sm:aspect-square" : ""
        }`}
      >
        <BannerImage src={desktop} mobileSrc={mobileImageUrl} priority className="-z-20" />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950/85 via-ink-950/55 to-ink-900/30"
          aria-hidden="true"
        />
        <div className="container-x animate-fade-up py-16 text-center opacity-0">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mx-auto mt-4 max-w-2xl text-lg text-sand-100">
              {subtitle}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-paper">
      <div className="container-x section-y relative animate-fade-up text-center opacity-0">
        <h1 className="text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-600">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
