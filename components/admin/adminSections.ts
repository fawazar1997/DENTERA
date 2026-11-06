import {
  Archive,
  BookUser,
  Building2,
  CalendarCheck,
  Files,
  FolderOpen,
  Handshake,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  MapPin,
  Share2,
  ShieldCheck,
  Stethoscope,
  Tag,
  Type,
} from "lucide-react";
import type { ComponentType } from "react";
import { RiyalIcon } from "@/components/RiyalIcon";
import type { Dictionary } from "@/lib/dictionaries";

type AdminText = keyof Dictionary["admin"];

export type AdminSection = {
  /** Path under /admin ("" is the dashboard). */
  path: string;
  label: AdminText;
  /** One line on what the section is for (shown on the dashboard). */
  hint?: AdminText;
  icon: ComponentType<{ className?: string }>;
};

export type AdminSectionGroup = {
  label: AdminText;
  sections: AdminSection[];
};

/**
 * Every control panel section, grouped by task. The sidebar and the
 * dashboard are both built from this list, so they always match.
 */
export const ADMIN_SECTION_GROUPS: AdminSectionGroup[] = [
  {
    label: "navGroupOverview",
    sections: [
      { path: "", label: "dashboardTitle", icon: LayoutDashboard },
      { path: "/supervisor", label: "supervisorLink", hint: "hintSupervisor", icon: ShieldCheck },
      { path: "/activity", label: "activity", hint: "hintActivity", icon: History },
    ],
  },
  {
    label: "navGroupBookings",
    sections: [
      { path: "/bookings", label: "bookings", hint: "hintBookings", icon: CalendarCheck },
      { path: "/directory", label: "directory", hint: "hintDirectory", icon: BookUser },
      { path: "/prices", label: "prices", hint: "hintPrices", icon: RiyalIcon },
    ],
  },
  {
    // Internal admin tools for the branches; more will be added here.
    label: "navGroupAdminSystems",
    sections: [
      { path: "/forms", label: "formsArchive", hint: "hintForms", icon: FolderOpen },
      { path: "/letters", label: "lettersLog", hint: "hintLetters", icon: Archive },
      { path: "/documents", label: "documents", hint: "hintDocuments", icon: Files },
    ],
  },
  {
    label: "navGroupMedical",
    sections: [
      { path: "/doctors", label: "doctors", hint: "hintDoctors", icon: Stethoscope },
      { path: "/departments", label: "departments", hint: "hintDepartments", icon: Building2 },
    ],
  },
  {
    label: "navGroupContent",
    sections: [
      { path: "/home", label: "homeSections", hint: "hintHome", icon: LayoutTemplate },
      { path: "/offers", label: "offers", hint: "hintOffers", icon: Tag },
      { path: "/banners", label: "banners", hint: "hintBanners", icon: ImageIcon },
      { path: "/partners", label: "partners", hint: "hintPartners", icon: Handshake },
      { path: "/texts", label: "texts", hint: "hintTexts", icon: Type },
    ],
  },
  {
    label: "navGroupClinic",
    sections: [
      { path: "/branches", label: "branches", hint: "hintBranches", icon: MapPin },
      { path: "/social", label: "social", hint: "hintSocial", icon: Share2 },
    ],
  },
];
