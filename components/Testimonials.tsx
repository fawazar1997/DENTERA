import { Star, Quote } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { Reveal } from "./Reveal";

const testimonials = [
  {
    nameEn: "Amal Al-Zahrani",
    nameAr: "أمل الزهراني",
    quoteEn:
      "The team at Dentera made my daughter's first dental visit a wonderful experience. So gentle and patient!",
    quoteAr:
      "جعل فريق دنتيرا زيارة ابنتي الأولى للأسنان تجربة رائعة. لطيفون وصبورون جدًا!",
  },
  {
    nameEn: "Yousef Al-Ahmadi",
    nameAr: "يوسف الأحمدي",
    quoteEn:
      "I finally got the confident smile I always wanted. Professional, modern, and welcoming clinic.",
    quoteAr:
      "حصلت أخيرًا على الابتسامة الواثقة التي طالما أردتها. عيادة احترافية وحديثة وترحيبية.",
  },
  {
    nameEn: "Reem Al-Sulaiman",
    nameAr: "ريم السليمان",
    quoteEn:
      "Painless root canal treatment and a doctor who explained every step. Highly recommend Dentera.",
    quoteAr:
      "علاج جذور خالٍ من الألم مع طبيب يشرح كل خطوة. أنصح بشدة بعيادة دنتيرا.",
  },
];

export function Testimonials({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
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
            <Reveal key={testimonial.nameEn} delay={i * 80}>
              <figure className="card flex h-full flex-col p-7">
                <Quote className="h-8 w-8 text-primary-200" />
                <div className="mt-3 flex gap-0.5 text-accent-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink-700">
                  “
                  {locale === "ar" ? testimonial.quoteAr : testimonial.quoteEn}
                  ”
                </blockquote>
                <figcaption className="mt-5 text-sm font-semibold text-ink-900">
                  {locale === "ar" ? testimonial.nameAr : testimonial.nameEn}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
