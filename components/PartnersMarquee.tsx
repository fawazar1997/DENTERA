import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import type { Partner } from "@/lib/types";

function PartnerLogo({ partner, locale }: { partner: Partner; locale: Locale }) {
  const name = locale === "ar" ? partner.nameAr : partner.nameEn;
  const content = partner.logoUrl ? (
    <Image
      src={partner.logoUrl}
      alt={name}
      width={320}
      height={160}
      className="h-14 w-auto max-w-[9rem] object-contain"
    />
  ) : (
    <span className="text-center text-sm font-semibold text-ink-700">{name}</span>
  );

  const box =
    "flex h-24 w-48 flex-shrink-0 items-center justify-center rounded-xl2 border border-ink-100 bg-white px-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-soft";

  return partner.websiteUrl ? (
    <a
      href={partner.websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={name}
      className={box}
    >
      {content}
    </a>
  ) : (
    <div title={name} className={box}>
      {content}
    </div>
  );
}

/**
 * Partner logos gliding across the page in an endless loop. The list is
 * rendered twice side by side and the track slides by half its width, so
 * the loop is seamless. Hovering pauses it; reduced-motion users get a
 * static, wrapping row instead.
 */
export function PartnersMarquee({
  partners,
  locale,
  dict,
}: {
  partners: Partner[];
  locale: Locale;
  dict: Dictionary;
}) {
  if (partners.length === 0) return null;

  // Repeat short lists so one copy is always wider than the screen.
  const copies = Math.max(1, Math.ceil(8 / partners.length));
  const row = Array.from({ length: copies }, () => partners).flat();
  const seconds = Math.max(20, row.length * 4);

  return (
    <section className="section-y overflow-hidden bg-white">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
            {dict.home.partnersTitle}
          </h2>
          <p className="mt-4 text-lg text-ink-600">
            {dict.home.partnersSubtitle}
          </p>
        </div>
      </div>

      <div
        dir="ltr"
        className="marquee group relative mt-12 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      >
        <div
          className="marquee-track flex w-max gap-6 py-3 group-hover:[animation-play-state:paused]"
          style={{ animationDuration: `${seconds}s` }}
        >
          {[0, 1].map((copy) =>
            row.map((partner, i) => (
              <div key={`${copy}-${i}`} aria-hidden={copy === 1 || undefined}>
                <PartnerLogo partner={partner} locale={locale} />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
