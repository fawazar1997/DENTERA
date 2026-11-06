import { BookOpen, FileText, ScrollText, Stethoscope } from "lucide-react";
import type { DocCategoryIcon } from "@/lib/types";

const ICONS = { policies: ScrollText, guides: BookOpen, medical: Stethoscope, file: FileText };

/** A documents section's icon. */
export function DocIcon({ icon, className }: { icon: DocCategoryIcon; className?: string }) {
  const Icon = ICONS[icon] ?? FileText;
  return <Icon className={className} />;
}
