// Social media platforms the control panel can link to. Client-safe.

export const SOCIAL_PLATFORMS = [
  { key: "instagram", en: "Instagram", ar: "إنستقرام", placeholder: "https://instagram.com/…" },
  { key: "x", en: "X (Twitter)", ar: "إكس (تويتر)", placeholder: "https://x.com/…" },
  { key: "snapchat", en: "Snapchat", ar: "سناب شات", placeholder: "https://www.snapchat.com/@…" },
  { key: "tiktok", en: "TikTok", ar: "تيك توك", placeholder: "https://www.tiktok.com/@…" },
  { key: "whatsapp", en: "WhatsApp", ar: "واتساب", placeholder: "https://wa.me/9665…" },
  { key: "youtube", en: "YouTube", ar: "يوتيوب", placeholder: "https://youtube.com/@…" },
  { key: "facebook", en: "Facebook", ar: "فيسبوك", placeholder: "https://facebook.com/…" },
  { key: "linkedin", en: "LinkedIn", ar: "لينكدإن", placeholder: "https://linkedin.com/company/…" },
  { key: "threads", en: "Threads", ar: "ثريدز", placeholder: "https://threads.net/@…" },
  { key: "telegram", en: "Telegram", ar: "تيليجرام", placeholder: "https://t.me/…" },
] as const;

export type SocialKey = (typeof SOCIAL_PLATFORMS)[number]["key"];
export type SocialLinks = Partial<Record<SocialKey, string>>;

/** Dentera's public accounts, used until links are saved in the panel. */
export const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  x: "https://x.com/dentera_sa",
  snapchat: "https://www.snapchat.com/@dentera_sa",
};
