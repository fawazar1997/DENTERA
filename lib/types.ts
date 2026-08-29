export type Department = {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
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
  bioEn?: string;
  bioAr?: string;
  yearsExperience?: number;
  photoUrl?: string;
  active: boolean;
};

export type SiteSettings = {
  bannerUrl?: string;
};

export type Inquiry = {
  id: string;
  name: string;
  mobile: string;
  departmentId: string;
  status: "new" | "contacted";
  createdAt: string;
};

export type Database = {
  departments: Department[];
  doctors: Doctor[];
  settings: SiteSettings;
  inquiries: Inquiry[];
};
