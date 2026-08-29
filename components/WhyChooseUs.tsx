import { Award, Cpu, HeartHandshake, CalendarClock } from "lucide-react";
import type { Dictionary } from "@/lib/dictionaries";
import { Reveal } from "./Reveal";

export function WhyChooseUs({ dict }: { dict: Dictionary }) {
  const items = [
    { icon: Award, title: dict.home.why1Title, body: dict.home.why1Body },
    { icon: Cpu, title: dict.home.why2Title, body: dict.home.why2Body },
    {
      icon: HeartHandshake,
      title: dict.home.why3Title,
      body: dict.home.why3Body,
    },
    {
      icon: CalendarClock,
      title: dict.home.why4Title,
      body: dict.home.why4Body,
    },
  ];

  return (
    <section className="section-y bg-white">
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
