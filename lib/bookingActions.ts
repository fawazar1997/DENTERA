"use server";

import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import { getActiveDepartments, getDoctor } from "./db";
import {
  createBooking,
  isBookingStatus,
  isValidBookingsKey,
  normalizeSaudiMobile,
  updateBooking,
} from "./bookings";

export type BookingFormState =
  | { ok: true }
  | { ok: false; error?: "name" | "phone" | "server"; at?: number };

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
  const doctor = doctorId ? await getDoctor(doctorId) : undefined;
  const source = text("source", 20).replace(/[^a-z-]/g, "") || undefined;

  try {
    await createBooking({
      name,
      phone,
      departmentId: departmentId || doctor?.departmentId || "",
      doctorId: doctor?.active ? doctor.id : undefined,
      source,
    });
    return { ok: true };
  } catch (error) {
    console.error("Failed to save booking request:", error);
    return { ok: false, error: "server", at: Date.now() };
  }
}

/**
 * Staff: update a request's status from the call-center link (checked by
 * its key) or from the control panel (checked by the admin session).
 */
export async function updateBookingAction(formData: FormData): Promise<{ ok: boolean }> {
  const key = String(formData.get("key") ?? "");
  const allowed = key
    ? await isValidBookingsKey(key)
    : await verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!allowed) return { ok: false };

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!isBookingStatus(status)) return { ok: false };
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || undefined;
  const agent = String(formData.get("agent") ?? "").trim().slice(0, 60) || undefined;

  return { ok: await updateBooking(id, { status, note, agent }) };
}
