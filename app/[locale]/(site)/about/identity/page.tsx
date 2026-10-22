import type { Metadata } from "next";
import Image from "next/image";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import { getSettings } from "@/lib/db";
import { PageBanner } from "@/components/PageBanner";
import { AboutTabs } from "@/components/AboutTabs";
import { CopyHex } from "@/components/CopyHex";
import { CtaBanner } from "@/components/CtaBanner";
import { Reveal } from "@/components/Reveal";

// Content is edited live from the control panel, so render on request
// (the database read itself is cached until the next save).
export const dynamic = "force-dynamic";

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : defaultLocale;
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const dict = await getSiteDictionary(resolveLocale(params.locale));
  return {
    title: `${dict.identity.title} — ${dict.meta.siteName}`,
    description: dict.identity.subtitle,
  };
}

/** The four identity colors, as on the identity sheet. */
/** The official palette (brand sheet, Oct 2026). */
const COLORS = [
  { key: "cyan", hex: "#0CB8CD", rgb: "12, 184, 205", text: "text-white" },
  { key: "navy", hex: "#141480", rgb: "20, 20, 128", text: "text-white" },
  { key: "beige", hex: "#C8BEB0", rgb: "200, 190, 176", text: "text-ink-900" },
  { key: "bone", hex: "#FCF3E8", rgb: "252, 243, 232", text: "text-ink-900" },
  { key: "pink", hex: "#DAACAB", rgb: "218, 172, 171", text: "text-ink-900" },
  { key: "turquoise", hex: "#08B7CC", rgb: "8, 183, 204", text: "text-white" },
  { key: "navyBlue", hex: "#292C87", rgb: "41, 44, 135", text: "text-white" },
] as const;

/**
 * Where each idea sits on the tooth mark, as a share of its width/height
 * (the drawing isn't mirrored in Arabic, so these are physical positions).
 */
const MARK_POINTS = [
  { n: 1, x: 33, y: 90 },
  { n: 2, x: 14, y: 27 },
  { n: 3, x: 68.5, y: 25 },
];

export default async function IdentityPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = resolveLocale(params.locale);
  const dict = await getSiteDictionary(locale);
  const settings = await getSettings();
  const t = dict.identity;

  const colorText = {
    cyan: { name: t.cyanName, meaning: t.cyanMeaning },
    navy: { name: t.navyName, meaning: t.navyMeaning },
    beige: { name: t.beigeName, meaning: t.beigeMeaning },
    pink: { name: t.pinkName, meaning: t.pinkMeaning },
    bone: { name: t.boneName, meaning: t.boneMeaning },
    turquoise: { name: t.turquoiseName, meaning: t.turquoiseMeaning },
    navyBlue: { name: t.navyBlueName, meaning: t.navyBlueMeaning },
  };
  const markPoints = [
    { title: t.markPoint1Title, body: t.markPoint1Body },
    { title: t.markPoint2Title, body: t.markPoint2Body },
    { title: t.markPoint3Title, body: t.markPoint3Body },
  ];

  return (
    <>
      <PageBanner
        title={t.title}
        subtitle={t.subtitle}
        imageUrl={settings.banners?.about}
        mobileImageUrl={settings.mobileBanners?.about}
      />
      <AboutTabs locale={locale} dict={dict} active="identity" />

      {/* Philosophy */}
      <section className="section-y bg-white">
        <div className="container-x grid items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
          <Reveal>
            <p className="eyebrow">{t.philosophyEyebrow}</p>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-ink-950 sm:text-5xl">
              {t.philosophyTitle}
            </h2>
            <p className="mt-6 text-lg leading-loose text-ink-600">
              {t.philosophyBody}
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-ink-900 to-ink-950 shadow-soft">
              <div
                className="absolute -bottom-16 -end-16 h-64 w-64 rounded-full bg-primary-500/30 blur-3xl"
                aria-hidden="true"
              />
              <div
                className="absolute -start-16 -top-16 h-56 w-56 rounded-full bg-accent-500/25 blur-3xl"
                aria-hidden="true"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/dentera-mark.svg"
                alt={dict.meta.siteName}
                className="absolute inset-0 m-auto h-[62%] w-auto"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* The mark, annotated */}
      <section className="section-y bg-ink-50/60">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
              {t.markTitle}
            </h2>
            <p className="mt-4 text-lg text-ink-600">{t.markBody}</p>
          </div>

          <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <div className="relative mx-auto flex aspect-[4/5] w-full max-w-sm items-center justify-center rounded-[2rem] bg-gradient-to-b from-sand-50 to-sand-200 p-12 shadow-card">
                <div className="relative h-full" style={{ aspectRatio: "1180 / 1611" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/dentera-mark.svg" alt="" className="h-full w-full" />
                  {MARK_POINTS.map((point) => (
                    <span
                      key={point.n}
                      className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink-900 text-sm font-extrabold text-white shadow-soft ring-4 ring-white"
                      style={{ left: `${point.x}%`, top: `${point.y}%` }}
                    >
                      {point.n}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>

            <ol className="space-y-4">
              {markPoints.map((point, i) => (
                <Reveal key={i} delay={i * 100}>
                  <li className="card flex gap-4 p-6">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ink-900 font-extrabold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-ink-900">{point.title}</h3>
                      <p className="mt-1 leading-relaxed text-ink-600">{point.body}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Wordmark */}
      <section className="section-y bg-white">
        <div className="container-x grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <Reveal>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
              {t.wordmarkTitle}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-600">{t.wordmarkBody}</p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            <Reveal delay={80}>
              <div className="flex aspect-[4/3] items-center justify-center rounded-[2rem] border border-ink-100 bg-paper p-10">
                <Image
                  src="/brand/dentera-logo-color.png"
                  alt={dict.meta.siteName}
                  width={784}
                  height={328}
                  className="h-auto w-full max-w-[15rem]"
                />
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div className="flex aspect-[4/3] items-center justify-center rounded-[2rem] bg-ink-900 p-10">
                <Image
                  src="/brand/dentera-logo-color.png"
                  alt={dict.meta.siteName}
                  width={784}
                  height={328}
                  className="h-auto w-full max-w-[15rem]"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Colors */}
      <section className="section-y bg-ink-50/60">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
              {t.colorsTitle}
            </h2>
            <p className="mt-4 text-lg text-ink-600">{t.colorsBody}</p>
          </div>

          {/* The colors side by side, as on the identity sheet */}
          <div className="mx-auto mt-10 flex h-16 max-w-3xl overflow-hidden rounded-2xl shadow-card" dir="ltr">
            {COLORS.map((color) => (
              <div key={color.key} className="flex-1" style={{ backgroundColor: color.hex }} />
            ))}
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {COLORS.map((color, i) => (
              <Reveal key={color.key} delay={i * 80} className="h-full">
                <div className="card flex h-full flex-col overflow-hidden">
                  <div
                    className={`flex h-36 items-end p-5 ${color.text} ${
                      color.key === "bone" ? "border-b border-ink-100" : ""
                    }`}
                    style={{ backgroundColor: color.hex }}
                  >
                    <span dir="ltr" className="text-2xl font-extrabold tracking-wide">
                      {color.hex}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-bold text-ink-900">
                      {colorText[color.key].name}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
                      {colorText[color.key].meaning}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-ink-100 pt-4">
                      <span dir="ltr" className="text-xs font-semibold text-ink-500">
                        RGB {color.rgb}
                      </span>
                      <CopyHex value={color.hex} label={t.copyHex} copiedLabel={t.copied} />
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Signature gradient — as on the team's name badges */}
          <Reveal>
            <div className="mt-12 grid items-center gap-8 rounded-[2rem] bg-white p-6 shadow-card sm:p-10 lg:grid-cols-2">
              <div>
                <h3 className="text-2xl font-extrabold text-ink-950">{t.gradientTitle}</h3>
                <p className="mt-3 leading-relaxed text-ink-600">{t.gradientBody}</p>
              </div>
              <div
                className="flex h-28 items-center justify-between gap-4 rounded-2xl px-6 shadow-soft"
                style={{
                  backgroundImage:
                    "linear-gradient(100deg, #b6eaf0 0%, #ece9e4 50%, #edd6d5 100%)",
                }}
                dir="ltr"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/dentera-mark.svg"
                  alt=""
                  className="h-14 w-auto [filter:brightness(0.55)_saturate(1.2)]"
                />
                <span className="text-end">
                  <span className="block text-lg font-extrabold text-ink-900">Dentera</span>
                  <span className="block text-sm font-bold text-ink-700" dir="rtl">
                    دنتيرا
                  </span>
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Identity in practice */}
      <section className="section-y bg-white">
        <Reveal className="container-x mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
            {t.applicationTitle}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-600">{t.applicationBody}</p>
          <div className="mt-8 flex justify-center gap-3" dir="ltr">
            {COLORS.map((color) => (
              <span
                key={color.key}
                className="h-10 w-10 rounded-full ring-4 ring-ink-50"
                style={{ backgroundColor: color.hex }}
                title={color.hex}
              />
            ))}
          </div>
        </Reveal>
      </section>

      <CtaBanner locale={locale} dict={dict} source="identity" />
    </>
  );
}
