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
  languagesEn?: string;
  languagesAr?: string;
  /** Branch ids the doctor works at. */
  branchIds?: string[];
  active: boolean;
};

export const PAGE_KEYS = [
  "home",
  "about",
  "departments",
  "doctors",
  "contact",
] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

export type SiteSettings = {
  /** Legacy single home banner; superseded by banners.home. */
  bannerUrl?: string;
  banners?: Partial<Record<PageKey, string>>;
};

export type Partner = {
  id: string;
  nameEn: string;
  nameAr: string;
  logoUrl?: string;
  websiteUrl?: string;
  active: boolean;
};

export type Branch = {
  id: string;
  nameEn: string;
  nameAr: string;
  addressEn: string;
  addressAr: string;
  /** Google Maps link opened when the branch is clicked. */
  mapUrl: string;
  phone?: string;
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
};
