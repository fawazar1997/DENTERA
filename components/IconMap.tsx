import {
  Stethoscope,
  Smile,
  Baby,
  Scissors,
  Sparkles,
  Activity,
  HeartPulse,
  PlusCircle,
  Syringe,
  ShieldCheck,
  Bone,
  Frown,
  type LucideIcon,
} from "lucide-react";

export const departmentIcons: Record<string, LucideIcon> = {
  Stethoscope,
  Smile,
  Baby,
  Scissors,
  Sparkles,
  Activity,
  HeartPulse,
  PlusCircle,
  Syringe,
  ShieldCheck,
  Bone,
  Frown,
};

export const departmentIconNames = Object.keys(departmentIcons);

export function DepartmentIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = departmentIcons[name] || Stethoscope;
  return <Icon className={className} />;
}
