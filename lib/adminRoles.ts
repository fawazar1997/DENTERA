import type { AdminUser } from "./auth";

/**
 * The control panel sections (paths under /admin; "" is the dashboard) each
 * account may open. The admin may open everything; anything not listed is
 * admin only, for pages and for the actions behind them alike.
 */
const MARKETING_SECTIONS = [
  "",
  // Medical team
  "/doctors",
  "/departments",
  // Website content
  "/home",
  "/offers",
  "/banners",
  "/partners",
  "/texts",
  // Clinic information
  "/branches",
  "/social",
];

export function canUseSection(user: AdminUser | null, section: string): boolean {
  if (user === "admin") return true;
  if (user === "marketing") return MARKETING_SECTIONS.includes(section);
  return false;
}
