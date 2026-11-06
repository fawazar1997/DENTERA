import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionUser, type AdminUser } from "./auth";
import { canUseSection } from "./adminRoles";
import { defaultLocale, isLocale, localePath } from "./i18n";

/**
 * Sends anyone without a valid session to the sign-in page. The middleware
 * already does this for every /admin page; each page checks again itself,
 * so a fault in the middleware can never expose the control panel (the
 * bookings page shows patients' names and phone numbers). Each page also
 * says which section it is, and an account that may not use it is sent to
 * the dashboard.
 */
export async function requireAdminPage(locale: string, section?: string): Promise<AdminUser> {
  const user = await sessionUser(cookies().get(SESSION_COOKIE)?.value);
  const lang = isLocale(locale) ? locale : defaultLocale;
  if (!user) redirect(localePath(lang, "/admin/login"));
  // A page another account can't use: back to the dashboard. Pages that
  // give no section are the admin's only.
  if (user !== "admin" && (section === undefined || !canUseSection(user, section))) {
    redirect(localePath(lang, "/admin"));
  }
  return user;
}

/** The signed-in control panel account (null: not signed in). */
export async function currentAdminUser(): Promise<AdminUser | null> {
  return sessionUser(cookies().get(SESSION_COOKIE)?.value);
}
