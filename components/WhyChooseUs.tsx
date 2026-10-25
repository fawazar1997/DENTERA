import {
  Award,
  CalendarCheck,
  Clock,
  HandHeart,
  MapPinned,
  ScanLine,
  ShieldCheck,
  Siren,
  Smile,
  Stethoscope,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/lib/dictionaries";
import { Reveal } from "./Reveal";

// Each reason's icon is picked from the words in its own title and text,
// so it stays fitting when the texts are edited in the control panel.
// Keywords are word stems in both languages (Arabic normalized: no
// diacritics, one alef, ة→ه, ى→ي).
const ICON_TOPICS: { icon: LucideIcon; words: string[] }[] = [
  { icon: Stethoscope, words: ["اخصائي", "خبير", "خبراء", "طبيب", "اطباء", "استشاري", "مدرب", "تخصص", "specialist", "expert", "doctor", "dentist", "trained"] },
  { icon: ScanLine, words: ["تقني", "اشعه", "ليزر", "رقمي", "اجهزه", "ادوات", "تصوير", "technolog", "x-ray", "laser", "digital", "equipment", "scan"] },
  { icon: HandHeart, words: ["رعايه", "لطيف", "راحه", "راحت", "اهتمام", "انساني", "ودود", "care", "gentle", "comfort", "caring", "kind"] },
  { icon: MapPinned, words: ["فرع", "فروع", "موقع", "ابها", "خميس", "زورونا", "قريب", "branch", "location", "visit", "closest", "abha", "khamis"] },
  { icon: ShieldCheck, words: ["تعقيم", "امان", "سلامه", "نظاف", "معايير", "جوده", "steril", "safe", "hygien", "quality", "standard"] },
  { icon: Wallet, words: ["سعر", "اسعار", "تقسيط", "دفع", "تكلفه", "تامين", "price", "afford", "payment", "instal", "insurance", "cost"] },
  { icon: CalendarCheck, words: ["موعد", "مواعيد", "حجز", "انتظار", "appointment", "booking", "schedule", "wait"] },
  { icon: Siren, words: ["طوارئ", "طارئ", "emergenc", "urgent"] },
  { icon: Clock, words: ["ساعات", "يوميا", "مساء", "hours", "daily", "evening", "open"] },
  { icon: Smile, words: ["ابتسام", "تجميل", "smile", "cosmetic", "aesthetic"] },
  { icon: Users, words: ["عائله", "اسره", "اطفال", "family", "children", "kids"] },
  { icon: Award, words: ["خبره", "سنوات", "تميز", "experience", "years", "award", "excellence"] },
];

/** Used when a reason's words match no topic (by position). */
const FALLBACK_ICONS: LucideIcon[] = [Stethoscope, ScanLine, HandHeart, MapPinned];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

/**
 * The best-matching icon for each reason (title words count double), each
 * icon used at most once, strongest matches assigned first.
 */
function pickIcons(items: { title: string; body: string }[]): LucideIcon[] {
  const scores = items.map(({ title, body }) => {
    const t = normalize(title);
    const b = normalize(body);
    return ICON_TOPICS.map(({ words }) =>
      words.reduce((sum, w) => sum + (t.includes(w) ? 2 : 0) + (b.includes(w) ? 1 : 0), 0)
    );
  });
  const chosen: (LucideIcon | undefined)[] = items.map(() => undefined);
  const used = new Set<number>();
  const pairs = scores
    .flatMap((row, item) => row.map((score, topic) => ({ item, topic, score })))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);
  for (const { item, topic } of pairs) {
    if (chosen[item] || used.has(topic)) continue;
    chosen[item] = ICON_TOPICS[topic].icon;
    used.add(topic);
  }
  return chosen.map((icon, i) => {
    if (icon) return icon;
    const spare = FALLBACK_ICONS.find((f) => !chosen.includes(f)) ?? FALLBACK_ICONS[i % FALLBACK_ICONS.length];
    chosen[i] = spare;
    return spare;
  });
}

export function WhyChooseUs({
  dict,
  className = "bg-white",
}: {
  dict: Dictionary;
  className?: string;
}) {
  const texts = [
    { title: dict.home.why1Title, body: dict.home.why1Body },
    { title: dict.home.why2Title, body: dict.home.why2Body },
    { title: dict.home.why3Title, body: dict.home.why3Body },
    { title: dict.home.why4Title, body: dict.home.why4Body },
  ];
  const icons = pickIcons(texts);
  const items = texts.map((text, i) => ({ ...text, icon: icons[i] }));

  return (
    <section className={`section-y ${className}`}>
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
            {dict.home.whyTitle}
          </h2>
          <p className="mt-4 text-lg text-ink-600">{dict.home.whySubtitle}</p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={i * 80}>
              <div className="card h-full p-7 hover:-translate-y-1 hover:shadow-soft">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
