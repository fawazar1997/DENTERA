import { WalletCards } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Partner } from "@/lib/types";
import { LogoTile } from "./LogoGallery";
import { Reveal } from "./Reveal";

/** Payment methods band: a short marketing line and the provider logos. */
export function PaymentMethods({
  methods,
  locale,
  title,
  body,
}: {
  methods: Partner[];
  locale: Locale;
  title: string;
  body: string;
}) {
  if (methods.length === 0) return null;

  return (
    <section className="py-12 sm:py-16">
      <div className="container-x">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-ink-950 via-ink-900 to-primary-900 px-6 py-10 text-white shadow-soft sm:px-10">
            <div
              className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full bg-primary-500/20 blur-2xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-20 -start-10 h-48 w-48 rounded-full bg-accent-500/20 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="text-center lg:text-start">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-primary-300">
                  <WalletCards className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
                <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-ink-200 lg:mx-0">{body}</p>
              </div>
              <ul className="flex flex-wrap justify-center gap-3 sm:gap-4">
                {methods.map((method) => (
                  <li key={method.id}>
                    <LogoTile
                      logo={method}
                      locale={locale}
                      className="h-20 w-32 border-white/10 sm:w-36"
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
