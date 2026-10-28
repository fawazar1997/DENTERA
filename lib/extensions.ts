import type { Doctor } from "./types";

/** Call-center extensions a request can be assigned to: 601–610 and 771–779. */
export const BOOKING_EXTENSIONS = [
  ...Array.from({ length: 10 }, (_, i) => String(601 + i)),
  ...Array.from({ length: 9 }, (_, i) => String(771 + i)),
];

export function isBookingExtension(value: string): boolean {
  return BOOKING_EXTENSIONS.includes(value);
}

/**
 * The extension a new request for this doctor goes to: the one set for the
 * chosen branch; with no branch chosen, the doctor's only extension (if
 * every branch they work at uses the same one). Undefined: the supervisor
 * assigns it.
 */
export function doctorExtension(
  doctor: Pick<Doctor, "extensions" | "branchIds"> | undefined,
  branchId: string | undefined
): string | undefined {
  const extensions = doctor?.extensions;
  if (!extensions) return undefined;
  if (branchId) return extensions[branchId];
  const branches = doctor.branchIds?.length ? doctor.branchIds : Object.keys(extensions);
  const distinct = new Set(branches.map((id) => extensions[id]).filter(Boolean));
  return distinct.size === 1 ? [...distinct][0] : undefined;
}
