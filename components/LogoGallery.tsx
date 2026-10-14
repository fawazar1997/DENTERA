import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import type { Partner } from "@/lib/types";
import { Reveal } from "./Reveal";

/** One logo tile; shows the name while no logo has been uploaded. */
export function LogoTile({
  logo,
  locale,
  className = "h-24 w-40 sm:w-48",
}: {
  logo: Partner;
  locale: Locale;
  className?: string;
}) {
  const name = locale === "ar" ? logo.nameAr : logo.nameEn;
  const content = logo.logoUrl ? (
    <Image
      unoptimized
      src={logo.logoUrl}
      alt={name}
      width={320}
      height={160}
      className="h-auto max-h-12 w-auto max-w-full object-contain"
    />
  ) : (
    <span className="text-center text-base font-extrabold tracking-tight text-ink-800">{name}</span>
  );

  const box = `flex flex-shrink-0 items-center justify-center rounded-xl2 border border-ink-100 bg-white px-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-soft ${className}`;

  return logo.websiteUrl ? (
    <a href={logo.websiteUrl} target="_blank" rel="noopener noreferrer" title={name} className={box}>
      {content}
    </a>
  ) : (
    <div title={name} className={box}>
      {content}
    </div>
  );
}

/**
 * A still gallery of logos: centred rows that wrap, so each logo added
 * just lands on the next row.
 */
export function LogoGallery({
  logos,
  locale,
  title,
  subtitle,
  className = "bg-white",
}: {
  logos: Partner[];
  locale: Locale;
  title: string;
  subtitle: string;
  className?: string;
}) {
  if (logos.length === 0) return null;

  return (
    <section className={`section-y ${className}`}>
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">{title}</h2>
          <p className="mt-4 text-lg text-ink-600">{subtitle}</p>
        </div>
        <ul className="mx-auto mt-12 flex max-w-5xl flex-wrap justify-center gap-4 sm:gap-6">
          {logos.map((logo, i) => (
            <li key={logo.id}>
              <Reveal delay={(i % 5) * 60}>
                <LogoTile logo={logo} locale={locale} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
