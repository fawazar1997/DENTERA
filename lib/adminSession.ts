import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import { defaultLocale, isLocale, localePath } from "./i18n";

/**
 * Sends anyone without a valid session to the sign-in page. The middleware
 * already does this for every /admin page; each page checks again itself,
 * so a fault in the middleware can never expose the control panel (the
 * bookings page shows patients' names and phone numbers).
 */
export async function requireAdminPage(locale: string): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    redirect(localePath(isLocale(locale) ? locale : defaultLocale, "/admin/login"));
  }
}
