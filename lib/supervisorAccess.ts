import { bookingsRole } from "./bookings";
import { getSettings } from "./db";

/** True when the key is the supervisor link's and editing doctors' working hours is allowed. */
export async function supervisorMayEditHours(key: string | undefined | null): Promise<boolean> {
  if ((await bookingsRole(key)) !== "supervisor") return false;
  return (await getSettings()).supervisorCanEditHours !== false;
}
