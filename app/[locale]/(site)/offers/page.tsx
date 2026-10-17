import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getSiteDictionary } from "@/lib/content";
import { getLiveOffers, getSettings } from "@/lib/db";
import { PageBanner } from "@/components/PageBanner";
import { OfferCard } from "@/components/OfferCard";
import { CtaBanner } from "@/components/CtaBanner";
import { Reveal } from "@/components/Reveal";

// Content is edited live from the control panel, so render on request
// (the database read itself is cached until the next save).
export const dynamic = "force-dynamic";

export default async function OffersPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = await getSiteDictionary(locale);
  const settings = await getSettings();
  const offers = await getLiveOffers();

  return (
    <>
      <PageBanner
        title={dict.offers.title}
        subtitle={dict.offers.subtitle}
        imageUrl={settings.banners?.offers}
      />
      <section className="section-y bg-white">
        <div className="container-x">
          {offers.length === 0 ? (
            <p className="text-center text-ink-500">{dict.offers.empty}</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer, i) => (
                <Reveal key={offer.id} delay={(i % 3) * 100} className="h-full">
                  <OfferCard offer={offer} locale={locale} dict={dict} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
      <CtaBanner locale={locale} dict={dict} source="offers" />
    </>
  );
}
