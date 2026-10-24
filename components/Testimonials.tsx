import { Star, Quote } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { getActiveBranches } from "@/lib/db";
import { getShownReviews } from "@/lib/googleReviews";
import { Reveal } from "./Reveal";

function Stars({ rating = 5 }: { rating?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? "fill-accent-500 text-accent-500" : "text-ink-200"}`}
        />
      ))}
    </div>
  );
}

/** Google's "G", so visitors see where a review comes from. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

/**
 * Patients' reviews: the Google reviews chosen in the control panel (with
 * each branch's Google rating), or the manual texts until some are chosen.
 */
export async function Testimonials({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const ar = locale === "ar";
  const [{ reviews, summaries }, branches] = await Promise.all([
    getShownReviews().catch(() => ({ reviews: [], summaries: [] })),
    getActiveBranches(),
  ]);
  const branchById = new Map(branches.map((b) => [b.id, b]));
  const fromGoogle = reviews.length > 0;

  const manual = [
    { name: dict.testimonials.t1Name, quote: dict.testimonials.t1Quote },
    { name: dict.testimonials.t2Name, quote: dict.testimonials.t2Quote },
    { name: dict.testimonials.t3Name, quote: dict.testimonials.t3Quote },
  ].filter((t) => t.quote.trim());

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(ar ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
      year: "numeric",
      month: "long",
    });

  return (
    <section className="section-y bg-primary-50/60">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
            {dict.home.testimonialsTitle}
          </h2>
          <p className="mt-4 text-lg text-ink-600">
            {dict.home.testimonialsSubtitle}
          </p>
        </div>

        {fromGoogle && summaries.some((s) => s.averageRating) && (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {summaries
              .filter((s) => s.averageRating && branchById.has(s.branchId))
              .map((s) => {
                const branch = branchById.get(s.branchId)!;
                return (
                  <a
                    key={s.branchId}
                    href={branch.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-card transition hover:shadow-soft"
                  >
                    <GoogleMark />
                    <span className="font-bold text-ink-900">{ar ? branch.nameAr : branch.nameEn}</span>
                    <span className="flex items-center gap-1 font-extrabold text-ink-900">
                      <Star className="h-4 w-4 fill-accent-500 text-accent-500" />
                      {s.averageRating!.toFixed(1)}
                    </span>
                    {s.totalReviewCount ? (
                      <span className="text-ink-500">
                        · {s.totalReviewCount.toLocaleString("en")} {dict.home.googleReviewsLabel}
                      </span>
                    ) : null}
                  </a>
                );
              })}
          </div>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {fromGoogle
            ? reviews.map((review, i) => {
                const branch = branchById.get(review.branchId);
                return (
                  <Reveal key={review.id} delay={(i % 3) * 80}>
                    <figure className="card flex h-full flex-col p-7">
                      <div className="flex items-center justify-between gap-3">
                        <Stars rating={review.rating} />
                        <span className="flex items-center gap-1.5 text-xs font-bold text-ink-500">
                          <GoogleMark />
                          {dict.home.googleReviewFrom}
                        </span>
                      </div>
                      <blockquote dir="auto" className="mt-4 flex-1 whitespace-pre-line text-start text-sm leading-relaxed text-ink-700">
                        {review.comment}
                      </blockquote>
                      <figcaption className="mt-5 flex items-center gap-3">
                        {review.photoUrl ? (
                          // Google's own profile photo; not proxied or stored.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={review.photoUrl}
                            alt=""
                            width={36}
                            height={36}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-ink-900">
                            {(review.author || "G").charAt(0)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span dir="auto" className="block truncate text-sm font-semibold text-ink-900">
                            {review.author || dict.home.googleReviewFrom}
                          </span>
                          <span className="block text-xs text-ink-500">
                            {date(review.createdAt)}
                            {branch ? ` · ${ar ? branch.nameAr : branch.nameEn}` : ""}
                          </span>
                        </span>
                      </figcaption>
                    </figure>
                  </Reveal>
                );
              })
            : manual.map((testimonial, i) => (
                <Reveal key={i} delay={i * 80}>
                  <figure className="card flex h-full flex-col p-7">
                    <Quote className="h-8 w-8 text-primary-200" />
                    <div className="mt-3">
                      <Stars />
                    </div>
                    <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink-700">
                      “{testimonial.quote}”
                    </blockquote>
                    <figcaption className="mt-5 text-sm font-semibold text-ink-900">
                      {testimonial.name}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  );
}
