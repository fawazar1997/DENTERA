import type { SVGProps } from "react";
import type { Department } from "@/lib/types";

// Line icons drawn for each dental specialty (24×24, stroke = currentColor).
type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

// Shared tooth outline: crown on top, two roots below.
const TOOTH =
  "M7.5 3.5c-2.2 0-3.8 1.9-3.6 4.4.1 1.6.7 2.7 1.2 3.9.5 1.3.6 2.8.8 4.6.2 2.2.7 4.1 1.9 4.1 1.4 0 1.6-2.2 2-4.2.3-1.4.9-2.1 2.2-2.1s1.9.7 2.2 2.1c.4 2 .6 4.2 2 4.2 1.2 0 1.7-1.9 1.9-4.1.2-1.8.3-3.3.8-4.6.5-1.2 1.1-2.3 1.2-3.9.2-2.5-1.4-4.4-3.6-4.4-1.6 0-2.9.9-4.5.9s-2.9-.9-4.5-.9Z";

// General dentistry: a plain healthy tooth.
function ToothIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d={TOOTH} />
      <path d="M8 7.2c.6-.5 1.4-.7 2.2-.5" />
    </Svg>
  );
}

// Orthodontics: tooth with a bracket and archwire.
function BracesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d={TOOTH} />
      <path d="M3.8 9h16.4" />
      <rect x="9.6" y="7.4" width="4.8" height="3.2" rx="0.6" />
    </Svg>
  );
}

// Pediatric dentistry: a smiling tooth.
function KidToothIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d={TOOTH} />
      <path d="M9.2 8.2v.4M14.8 8.2v.4" strokeWidth={2} />
      <path d="M9.4 10.6c1.4 1.3 3.8 1.3 5.2 0" />
    </Svg>
  );
}

// Oral & maxillofacial surgery: tooth with a scalpel.
function SurgeryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.6 3.5C3.9 3.5 2.6 5 2.8 7c.1 1.2.6 2.1.9 3 .4 1 .5 2.2.6 3.6.2 1.7.6 3.2 1.5 3.2 1.1 0 1.3-1.7 1.6-3.3.2-1.1.7-1.6 1.7-1.6s1.5.5 1.7 1.6c.3 1.6.5 3.3 1.6 3.3.9 0 1.3-1.5 1.5-3.2.1-1.4.2-2.6.6-3.6.3-.9.8-1.8.9-3 .2-2-1.1-3.5-2.8-3.5-1.3 0-2.3.7-3.5.7s-2.2-.7-3.5-.7Z" />
      <path d="m14.5 20.5 6.2-6.2a1.4 1.4 0 0 0-2-2L12.5 18.5" />
      <path d="m12.5 18.5 2 2" />
    </Svg>
  );
}

// Cosmetic dentistry: a sparkling tooth.
function SparkleToothIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 5.5c-1.9 0-3.3 1.6-3.1 3.8.1 1.4.6 2.3 1 3.4.4 1.1.5 2.4.7 4 .2 1.9.6 3.6 1.6 3.6 1.2 0 1.4-1.9 1.7-3.6.3-1.2.8-1.8 1.9-1.8s1.6.6 1.9 1.8c.3 1.7.5 3.6 1.7 3.6 1 0 1.4-1.7 1.6-3.6.2-1.6.3-2.9.7-4 .4-1.1.9-2 1-3.4.2-2.2-1.2-3.8-3.1-3.8-1.4 0-2.5.8-3.8.8s-2.4-.8-3.8-.8Z" />
      <path d="M19 2.5v4M17 4.5h4" />
      <path d="M21 9.5v2M20 10.5h2" />
    </Svg>
  );
}

// Endodontics (root canal): tooth with the canals inside the roots.
function RootCanalIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d={TOOTH} />
      <path d="M10 8.5c.2 2.6-.3 5.4-1.2 8.7M14 8.5c-.2 2.6.3 5.4 1.2 8.7" />
      <path d="M10 8.5c1.3-.7 2.7-.7 4 0" />
    </Svg>
  );
}

// Restorative dentistry: tooth with a filling.
function FillingIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d={TOOTH} />
      <path
        d="M10 6.7c.6.4 1.2.6 2 .6s1.4-.2 2-.6v2.1c0 1.1-.9 2-2 2s-2-.9-2-2V6.7Z"
        fill="currentColor"
        fillOpacity={0.25}
      />
    </Svg>
  );
}

// Periodontics (gum care): tooth set in a gum line.
function GumIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d={TOOTH} />
      <path d="M2.5 13.5c1.6-1.4 3-1.4 4.6 0 1.6 1.4 3 1.4 4.6 0 1.6-1.4 3-1.4 4.6 0 1.6 1.4 3 1.4 4.6 0" />
    </Svg>
  );
}

// Implants & prosthodontics: crown on an implant screw.
function ImplantIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3.5c-1.8 0-3 1.4-2.8 3.3.1 1.2.6 2 1 2.7h13.6c.4-.7.9-1.5 1-2.7.2-1.9-1-3.3-2.8-3.3-1.4 0-2.5.7-3.8.7h-2.4c-1.3 0-2.4-.7-3.8-.7Z" />
      <path d="M9 9.5h6v2H9z" />
      <path d="M9.5 11.5h5l-.6 8.2a1.9 1.9 0 0 1-3.8 0l-.6-8.2Z" />
      <path d="M9.6 13.6h4.8M9.8 15.7h4.4M10 17.8h4" />
    </Svg>
  );
}

export const dentalIcons = {
  tooth: ToothIcon,
  braces: BracesIcon,
  kids: KidToothIcon,
  surgery: SurgeryIcon,
  cosmetic: SparkleToothIcon,
  rootCanal: RootCanalIcon,
  filling: FillingIcon,
  gum: GumIcon,
  implant: ImplantIcon,
} as const;

export type DentalIconKey = keyof typeof dentalIcons;

/** Options for the department form's icon picker. */
export const dentalIconOptions: { key: DentalIconKey; en: string; ar: string }[] = [
  { key: "tooth", en: "Tooth (general)", ar: "سن (عام)" },
  { key: "braces", en: "Braces (orthodontics)", ar: "تقويم" },
  { key: "kids", en: "Smiling tooth (children)", ar: "سن مبتسم (أطفال)" },
  { key: "surgery", en: "Scalpel (surgery)", ar: "مشرط (جراحة)" },
  { key: "cosmetic", en: "Sparkling tooth (cosmetic)", ar: "سن لامع (تجميل)" },
  { key: "rootCanal", en: "Root canal", ar: "علاج الجذور" },
  { key: "filling", en: "Filling (restorative)", ar: "حشوة (ترميم)" },
  { key: "gum", en: "Gum line (periodontics)", ar: "اللثة" },
  { key: "implant", en: "Implant & crown", ar: "زراعة وتركيبات" },
];

// Keyword → icon, checked in order (so "Implants & Prosthodontics" is an
// implant, not general). Matches English and Arabic department names.
const NAME_RULES: [RegExp, DentalIconKey][] = [
  [/implant|prosth|زراع|تركيب/i, "implant"],
  [/ortho|brace|تقويم/i, "braces"],
  [/pediatric|paediatric|child|kid|أطفال|اطفال/i, "kids"],
  [/surg|maxill|جراح/i, "surgery"],
  [/cosmetic|aesthetic|esthetic|whiten|veneer|تجميل|تبييض/i, "cosmetic"],
  [/endo|root|canal|جذور|عصب/i, "rootCanal"],
  [/perio|gum|لثة|اللثه/i, "gum"],
  [/restor|filling|conserv|ترميم|حشو|تحفظ/i, "filling"],
];

export function iconKeyForDepartment(
  department: Pick<Department, "icon" | "nameEn" | "nameAr">
): DentalIconKey {
  if (department.icon in dentalIcons) return department.icon as DentalIconKey;
  // "auto" (and icons from before the dental set) → infer from the name.
  const name = `${department.nameEn} ${department.nameAr}`;
  for (const [pattern, key] of NAME_RULES) {
    if (pattern.test(name)) return key;
  }
  return "tooth";
}

export function DepartmentIcon({
  department,
  className,
}: {
  department: Pick<Department, "icon" | "nameEn" | "nameAr">;
  className?: string;
}) {
  const Icon = dentalIcons[iconKeyForDepartment(department)];
  return <Icon className={className} />;
}
