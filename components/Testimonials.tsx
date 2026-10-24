import { Star, Quote } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { Reveal } from "./Reveal";


export function Testimonials({ dict }: { locale: Locale; dict: Dictionary }) {
  const testimonials = [
    { name: dict.testimonials.t1Name, quote: dict.testimonials.t1Quote },
    { name: dict.testimonials.t2Name, quote: dict.testimonials.t2Quote },
    { name: dict.testimonials.t3Name, quote: dict.testimonials.t3Quote },
  ].filter((t) => t.quote.trim());

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

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial, i) => (
            <Reveal key={i} delay={i * 80}>
              <figure className="card flex h-full flex-col p-7">
                <Quote className="h-8 w-8 text-primary-200" />
                <div className="mt-3 flex gap-0.5 text-accent-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink-700">
                  “
                  {testimonial.quote}
                  ”
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
