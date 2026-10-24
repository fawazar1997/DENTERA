import type { MetadataRoute } from "next";
import { localePath } from "@/lib/i18n";
import { getActiveDoctors, getLiveOffers } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";

// Built from the live data on request, so new doctors and offers appear
// without a new deployment.
export const dynamic = "force-dynamic";

/** Every public page, in Arabic (the main address) with its English twin. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [doctors, offers] = await Promise.all([getActiveDoctors(), getLiveOffers()]);
  const pages: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/doctors", priority: 0.9, changeFrequency: "weekly" },
    { path: "/departments", priority: 0.8, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.8, changeFrequency: "monthly" },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/about/identity", priority: 0.4, changeFrequency: "monthly" },
    ...(offers.length > 0
      ? [{ path: "/offers", priority: 0.7, changeFrequency: "weekly" as const }]
      : []),
    ...doctors.map((d) => ({ path: `/doctors/${d.id}`, priority: 0.7, changeFrequency: "monthly" as const })),
    ...offers.map((o) => ({ path: `/offers/${o.id}`, priority: 0.5, changeFrequency: "weekly" as const })),
  ];

  return pages.flatMap(({ path, priority, changeFrequency }) => {
    const languages = {
      ar: absoluteUrl(localePath("ar", path)),
      en: absoluteUrl(localePath("en", path)),
    };
    return [
      { url: languages.ar, priority, changeFrequency, alternates: { languages } },
      { url: languages.en, priority: Math.round(priority * 0.8 * 10) / 10, changeFrequency, alternates: { languages } },
    ];
  });
}
