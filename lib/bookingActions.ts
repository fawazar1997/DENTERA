"use server";

import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import { getActiveBranches, getActiveDepartments, getDoctor } from "./db";
import {
  BOOKING_EXTENSIONS,
  createBooking,
  isBookingStatus,
  bookingsRole,
  normalizeSaudiMobile,
  reassignBookings,
  updateBooking,
} from "./bookings";
import { doctorExtension } from "./extensions";
import { doctorDepartmentIds } from "./doctorDepartments";

export type BookingFormState =
  | { ok: true }
  | { ok: false; error?: "name" | "phone" | "branch" | "server"; at?: number };

/** Faster than this after the form was shown, it's a bot, not a person. */
const MIN_FILL_MS = 2500;

/** Public: an appointment request from the website's booking form. */
export async function submitBookingAction(
  _prev: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const text = (key: string, max: number) =>
    String(formData.get(key) ?? "").trim().slice(0, max);

  // Spam guards: a hidden field people never fill, and a minimum time
  // between the form being shown and sent. Bots get a fake success.
  const shownAt = Number(formData.get("t"));
  if (text("website", 200) || !shownAt || Date.now() - shownAt < MIN_FILL_MS) {
    return { ok: true };
  }

  const name = text("name", 80).replace(/\s+/g, " ");
  if (name.length < 2) return { ok: false, error: "name", at: Date.now() };
  const phone = normalizeSaudiMobile(text("phone", 30));
  if (!phone) return { ok: false, error: "phone", at: Date.now() };

  const departments = await getActiveDepartments();
  const requested = text("departmentId", 80);
  const departmentId = departments.some((d) => d.id === requested) ? requested : "";
  const doctorId = text("doctorId", 80);
  const found = doctorId ? await getDoctor(doctorId) : undefined;
  const doctor = found?.active ? found : undefined;
  // The branches the patient may pick: the doctor's own (those still open)
  // when booking a doctor, otherwise any open branch.
  const activeBranches = (await getActiveBranches()).map((b) => b.id);
  const doctorBranches = activeBranches.filter((id) => doctor?.branchIds?.includes(id));
  const allowed = doctorBranches.length > 0 ? doctorBranches : activeBranches;
  const requestedBranch = text("branchId", 80);
  let branchId = allowed.includes(requestedBranch) ? requestedBranch : undefined;
  if (doctorBranches.length > 0 && !branchId) {
    // A doctor at one branch: that branch. At several: the patient must choose.
    if (doctorBranches.length > 1) return { ok: false, error: "branch", at: Date.now() };
    branchId = doctorBranches[0];
  }
  const source = text("source", 20).replace(/[^a-z-]/g, "") || undefined;

  try {
    await createBooking({
      name,
      phone,
      // A request for a specific doctor is for one of that doctor's
      // departments (the main one unless another of theirs was chosen).
      departmentId: doctor
        ? doctorDepartmentIds(doctor).includes(departmentId)
          ? departmentId
          : doctor.departmentId
        : departmentId,
      doctorId: doctor?.id,
      branchId,
      source,
      // Straight to the extension that handles this doctor at that branch.
      extension: doctorExtension(doctor, branchId),
    });
    return { ok: true };
  } catch (error) {
    console.error("Failed to save booking request:", error);
    return { ok: false, error: "server", at: Date.now() };
  }
}

/** Who's acting: the private link's key decides, else the admin session. */
async function staffRole(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  return key
    ? bookingsRole(key)
    : (await verifySessionToken(cookies().get(SESSION_COOKIE)?.value))
      ? "supervisor"
      : null;
}

/**
 * Staff: update a request from a private bookings link (checked by its
 * key) or from the control panel (checked by the admin session). Only the
 * supervisor's link and the control panel can assign the extension.
 */
export async function updateBookingAction(formData: FormData): Promise<{ ok: boolean }> {
  const role = await staffRole(formData);
  if (!role) return { ok: false };

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!isBookingStatus(status)) return { ok: false };
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || undefined;
  const agent = String(formData.get("agent") ?? "").trim().slice(0, 60) || undefined;
  // The call center can't change the extension: whatever it sends is ignored.
  let extension: string | null | undefined;
  if (role === "supervisor") {
    const ext = String(formData.get("extension") ?? "").trim();
    if (ext && !BOOKING_EXTENSIONS.includes(ext)) return { ok: false };
    extension = ext || null;
  }

  return { ok: await updateBooking(id, { status, note, agent, extension }) };
}

/**
 * Supervisor / control panel: move a doctor's requests (or everything on
 * one extension) to another extension at once.
 */
export async function reassignBookingsAction(
  formData: FormData
): Promise<{ ok: boolean; count?: number }> {
  if ((await staffRole(formData)) !== "supervisor") return { ok: false };
  const text = (key: string, max: number) =>
    String(formData.get(key) ?? "").trim().slice(0, max);

  const to = text("to", 10);
  const fromExtension = text("from", 10) || undefined;
  const doctorId = text("doctorId", 80) || undefined;
  if (!BOOKING_EXTENSIONS.includes(to)) return { ok: false };
  if (fromExtension && !BOOKING_EXTENSIONS.includes(fromExtension)) return { ok: false };
  if (doctorId && !(await getDoctor(doctorId))) return { ok: false };
  if (!doctorId && !fromExtension) return { ok: false };
  const requestedBranch = text("branchId", 80);
  const branchId = (await getActiveBranches()).some((b) => b.id === requestedBranch)
    ? requestedBranch
    : undefined;

  const count = await reassignBookings({
    doctorId,
    fromExtension,
    branchId,
    openOnly: formData.get("openOnly") === "on",
    to,
    agent: text("agent", 60) || undefined,
  });
  return { ok: true, count };
}
