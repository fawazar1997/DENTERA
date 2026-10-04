import Link from "next/link";
import {
  Stethoscope,
  Building2,
  Handshake,
  MapPin,
  Image as ImageIcon,
  Type,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getBranches, getDepartments, getDoctors, getPartners } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";

// Admin pages always need the current data, never a stale build-time or
// revalidation-cached snapshot, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const [doctors, departments, partners, branches] = await Promise.all([
    getDoctors(),
    getDepartments(),
    getPartners(),
    getBranches(),
  ]);
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  const cards = [
    {
      href: `/${locale}/admin/doctors`,
      icon: Stethoscope,
      label: dict.admin.totalDoctors,
      value: doctors.length,
      color: "bg-primary-500 text-white",
    },
    {
      href: `/${locale}/admin/departments`,
      icon: Building2,
      label: dict.admin.totalDepartments,
      value: departments.length,
      color: "bg-accent-500 text-ink-900",
    },
    {
      href: `/${locale}/admin/partners`,
      icon: Handshake,
      label: dict.admin.totalPartners,
      value: partners.length,
      color: "bg-ink-900 text-white",
    },
    {
      href: `/${locale}/admin/branches`,
      icon: MapPin,
      label: dict.admin.branches,
      value: branches.length,
      color: "bg-primary-700 text-white",
    },
  ];

  const shortcuts = [
    {
      href: `/${locale}/admin/texts`,
      icon: Type,
      label: dict.admin.texts,
      body: dict.admin.textsSubtitle,
    },
    {
      href: `/${locale}/admin/banners`,
      icon: ImageIcon,
      label: dict.admin.banners,
      body: dict.admin.bannersSubtitle,
    },
  ];

  return (
    <>
      <AdminNav locale={locale} dict={dict} />
      <div className="container-x py-10">
        <h1 className="text-2xl font-extrabold text-ink-950">
          {dict.admin.dashboardTitle}
        </h1>
        <p className="mt-1 text-ink-500">{dict.admin.dashboardSubtitle}</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="card group flex items-center justify-between p-7 hover:-translate-y-1 hover:shadow-soft"
            >
              <div>
                <p className="text-sm font-medium text-ink-500">{card.label}</p>
                <p className="mt-1 text-3xl font-extrabold text-ink-950">
                  {card.value}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-700">
                  {dict.admin.edit}
                  <Arrow className="h-3.5 w-3.5" />
                </span>
              </div>
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.color}`}
              >
                <card.icon className="h-7 w-7" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {shortcuts.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card group flex items-start gap-5 p-7 hover:-translate-y-1 hover:shadow-soft"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                <item.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-bold text-ink-900">
                  {item.label}
                  <Arrow className="h-4 w-4 text-primary-700" />
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">
                  {item.body}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
