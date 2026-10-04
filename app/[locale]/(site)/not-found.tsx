import Link from "next/link";
import { dictionaries } from "@/lib/dictionaries";

// Shown for a missing doctor profile (and other notFound() calls) inside the
// site layout. The locale isn't passed to not-found pages, so both
// languages are shown.
export default function SiteNotFound() {
  const en = dictionaries.en;
  const ar = dictionaries.ar;
  return (
    <section className="section-y bg-gradient-to-b from-primary-50 to-paper">
      <div className="container-x text-center">
        <p className="text-7xl font-extrabold text-primary-500">404</p>
        <h1 className="mt-4 text-2xl font-bold text-ink-950" dir="rtl">
          الصفحة غير موجودة
        </h1>
        <p className="mt-1 text-lg text-ink-600">Page not found</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/ar" className="btn-primary">
            {ar.nav.home}
          </Link>
          <Link href="/en" className="btn-outline">
            {en.nav.home}
          </Link>
        </div>
      </div>
    </section>
  );
}
