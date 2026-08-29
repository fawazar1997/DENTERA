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
  bioEn: string;
  bioAr: string;
  yearsExperience: number;
  active: boolean;
};

export type Database = {
  departments: Department[];
  doctors: Doctor[];
};
