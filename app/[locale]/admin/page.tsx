import Link from "next/link";
import { Stethoscope, Building2, ArrowRight, ArrowLeft } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getDepartments, getDoctors } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminDashboardPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale: Locale = isLocale(params.locale)
    ? params.locale
    : defaultLocale;
  const dict = getDictionary(locale);
  const doctors = getDoctors();
  const departments = getDepartments();
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  const cards = [
    {
      href: `/${locale}/admin/doctors`,
      icon: Stethoscope,
      label: dict.admin.totalDoctors,
      value: doctors.length,
      color: "bg-primary-600",
    },
    {
      href: `/${locale}/admin/departments`,
      icon: Building2,
      label: dict.admin.totalDepartments,
      value: departments.length,
      color: "bg-accent-500",
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

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:max-w-2xl">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="card group flex items-center justify-between p-7 hover:-translate-y-1 hover:shadow-soft"
            >
              <div>
                <p className="text-sm font-medium text-ink-500">
                  {card.label}
                </p>
                <p className="mt-1 text-3xl font-extrabold text-ink-950">
                  {card.value}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-700">
                  {dict.admin.edit}
                  <Arrow className="h-3.5 w-3.5" />
                </span>
              </div>
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white ${card.color}`}
              >
                <card.icon className="h-7 w-7" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
