import { Linkedin } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { SOCIAL_PLATFORMS, type SocialLinks as Links } from "@/lib/social";
import { SOCIAL_ICON_PATHS } from "@/lib/socialIconPaths";

function BrandIcon({ platform, className }: { platform: string; className?: string }) {
  if (platform === "linkedin") return <Linkedin className={className} />;
  const path = SOCIAL_ICON_PATHS[platform];
  if (!path) return null;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d={path} />
    </svg>
  );
}

/** Icon links to the social accounts set in Control Panel → Social Media. */
export function SocialLinks({
  links,
  locale,
  variant = "dark",
  size = "md",
}: {
  links?: Links;
  locale: Locale;
  variant?: "dark" | "light";
  size?: "md" | "lg";
}) {
  const items = SOCIAL_PLATFORMS.filter((p) => links?.[p.key]);
  if (items.length === 0) return null;

  const box = size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const icon = size === "lg" ? "h-5 w-5" : "h-[1.125rem] w-[1.125rem]";
  const colors =
    variant === "dark"
      ? "bg-white/10 text-ink-100 hover:bg-primary-500 hover:text-white"
      : "bg-primary-50 text-ink-900 hover:bg-ink-900 hover:text-white";

  return (
    <ul className="flex flex-wrap gap-2.5">
      {items.map((platform) => {
        const label = locale === "ar" ? platform.ar : platform.en;
        return (
          <li key={platform.key}>
            <a
              href={links![platform.key]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className={`flex ${box} items-center justify-center rounded-full transition duration-200 hover:-translate-y-0.5 ${colors}`}
            >
              <BrandIcon platform={platform.key} className={icon} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
