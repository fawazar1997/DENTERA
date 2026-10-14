import type { SocialLinks } from "./social";

export type Department = {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  /** A dental icon key, or "auto" to pick one from the department name. */
  icon: string;
  active: boolean;
};

export type Doctor = {
  id: string;
  nameEn: string;
  nameAr: string;
  titleEn: string;
  titleAr: string;
  departmentId: string;
  /** Short summary shown on the doctor card and at the top of the profile. */
  bioEn?: string;
  bioAr?: string;
  yearsExperience?: number;
  photoUrl?: string;
  /** Profile (CV) sections — one item per line. */
  qualificationsEn?: string;
  qualificationsAr?: string;
  experienceEn?: string;
  experienceAr?: string;
  servicesEn?: string;
  servicesAr?: string;
  achievementsEn?: string;
  achievementsAr?: string;
  languagesEn?: string;
  languagesAr?: string;
  /** Branch ids the doctor works at. */
  branchIds?: string[];
  /** Optional hours the doctor is in, per branch id (subset of branchIds). */
  hours?: Record<string, WeekSchedule>;
  /** Internal coordination number — shown only in the staff directory. */
  coordinationNumber?: string;
  /** List the doctor in the staff coordination directory (default yes). */
  showInDirectory?: boolean;
  active: boolean;
};

export const PAGE_KEYS = [
  "home",
  "about",
  "departments",
  "doctors",
  "offers",
  "contact",
] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

export type SiteSettings = {
  /** Legacy single home banner; superseded by banners.home. */
  bannerUrl?: string;
  banners?: Partial<Record<PageKey, string>>;
  /** Show the full-width banner at the top of the home page (default on). */
  showHomeBanner?: boolean;
  /** Photo of a Dentera branch, shown beside the home page headline. */
  heroImageUrl?: string;
  social?: SocialLinks;
  /**
   * Secret part of the staff directory link (/{locale}/directory/{key}).
   * Unset until generated in the control panel; regenerating revokes
   * the old link.
   */
  directoryKey?: string;
};

/** A promotional offer: a home page banner that opens its own page. */
export type Offer = {
  id: string;
  titleEn: string;
  titleAr: string;
  /** One-line summary shown on the banner and offer cards. */
  summaryEn?: string;
  summaryAr?: string;
  /** What's included — one item per line. */
  detailsEn?: string;
  detailsAr?: string;
  /** Terms & conditions — one item per line. */
  termsEn?: string;
  termsAr?: string;
  /** Wide banner image (also the offer page header). */
  imageUrl?: string;
  /** Prices in SAR; priceWas shows struck through with the discount. */
  priceNow?: number;
  priceWas?: number;
  /** Last day of the offer (YYYY-MM-DD); hidden from the site after it. */
  endsAt?: string;
  departmentId?: string;
  branchIds?: string[];
  active: boolean;
  /** Display order (lower first). */
  order?: number;
};

/** Home-page logo galleries a logo can belong to. */
export const LOGO_GROUPS = ["partners", "brands", "payments"] as const;
export type LogoGroup = (typeof LOGO_GROUPS)[number];

export type Partner = {
  id: string;
  /** Gallery the logo shows in (no value = partners). */
  group?: LogoGroup;
  nameEn: string;
  nameAr: string;
  logoUrl?: string;
  websiteUrl?: string;
  active: boolean;
};

/** One day's opening periods; times are "HH:MM" (24h). */
export type DayHours = {
  closed: boolean;
  periods: { from: string; to: string }[];
};

/** Seven days, indexed like Date.getDay() (0 = Sunday … 6 = Saturday). */
export type WeekSchedule = DayHours[];

export type Branch = {
  id: string;
  nameEn: string;
  nameAr: string;
  addressEn: string;
  addressAr: string;
  /** Google Maps link opened when the branch is clicked. */
  mapUrl: string;
  phone?: string;
  /** Weekly working hours, edited day by day in the control panel. */
  schedule?: WeekSchedule;
  /** Optional note under the hours, e.g. "Ramadan hours may differ". */
  hoursNoteEn?: string;
  hoursNoteAr?: string;
  /** Old free-text hours; shown only until a schedule is saved. */
  hoursEn?: string;
  hoursAr?: string;
  active: boolean;
};

/** Site text overrides edited from the control panel, keyed "section.key". */
export type ContentOverrides = {
  en?: Record<string, string>;
  ar?: Record<string, string>;
};

export type Database = {
  departments: Department[];
  doctors: Doctor[];
  settings: SiteSettings;
  partners: Partner[];
  branches: Branch[];
  content: ContentOverrides;
  offers: Offer[];
  /** Last one-time data update applied (see lib/migrations.ts). */
  dataVersion?: number;
};
