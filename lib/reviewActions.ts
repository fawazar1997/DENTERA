"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import { getActiveBranches, updateSettings } from "./db";
import { disconnectGoogle, getReviewsData, syncGoogleReviews } from "./googleReviews";

// Control panel actions for the Google reviews page. Server actions can be
// called from any page, so each checks the admin session itself.

async function requireAdmin(): Promise<void> {
  if (!(await verifySessionToken(cookies().get(SESSION_COOKIE)?.value))) {
    throw new Error("Unauthorized");
  }
}

function refresh() {
  revalidatePath("/", "layout");
}

/** Saves which Google location belongs to each branch. */
export async function saveGoogleLocationsAction(formData: FormData) {
  await requireAdmin();
  const googleLocations: Record<string, string> = {};
  for (const branch of await getActiveBranches()) {
    const value = String(formData.get(`location_${branch.id}`) ?? "").trim();
    if (/^accounts\/[^/]+\/locations\/[^/]+$/.test(value)) googleLocations[branch.id] = value;
  }
  await updateSettings({ googleLocations });
  refresh();
}

/** Fetches the reviews now (the reason of a failure is shown on the page). */
export async function syncGoogleReviewsAction() {
  await requireAdmin();
  await syncGoogleReviews().catch((error) => console.error("Google reviews sync failed:", error));
  refresh();
}

export async function disconnectGoogleAction() {
  await requireAdmin();
  await disconnectGoogle();
  refresh();
}

/** Saves the reviews shown on the website, in order. */
export async function saveShownReviewsAction(formData: FormData) {
  await requireAdmin();
  const known = new Set((await getReviewsData()).reviews.map((r) => r.id));
  const ids = formData.getAll("shown").map(String);
  const shownReviews = ids.filter((id, i) => known.has(id) && ids.indexOf(id) === i);
  await updateSettings({ shownReviews });
  refresh();
}
