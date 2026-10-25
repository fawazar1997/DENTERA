import type { Locale } from "./i18n";
import { getDictionary } from "./dictionaries";
import { getDepartments, getDoctors } from "./db";
import { getBookings } from "./bookings";
import type { BookingStatus } from "./types";
import type { BoardBooking, BoardLabels } from "@/components/BookingsBoard";

/** Everything the call-center board needs, with names resolved. */
export async function getBookingsBoardData(locale: Locale) {
  const dict = getDictionary(locale);
  const a = dict.admin;
  const ar = locale === "ar";
  const [bookings, departments, doctors] = await Promise.all([
    getBookings(),
    getDepartments(),
    getDoctors(),
  ]);
  const departmentName = new Map(departments.map((d) => [d.id, ar ? d.nameAr : d.nameEn]));
  const doctorName = new Map(doctors.map((d) => [d.id, ar ? d.nameAr : d.nameEn]));

  const statusLabels: Record<BookingStatus, string> = {
    new: a.statusNew,
    no_answer: a.statusNoAnswer,
    contacted: a.statusContacted,
    callback: a.statusCallback,
    booked: a.statusBooked,
    cancelled: a.statusCancelled,
  };
  const sourceLabels: Record<string, string> = {
    home: a.sourceHome,
    contact: a.sourceContact,
    doctor: a.sourceDoctor,
    doctors: a.sourceDoctors,
    departments: a.sourceDepartments,
    offers: a.sourceOffers,
    about: a.sourceAbout,
    identity: a.sourceIdentity,
  };

  const list: BoardBooking[] = bookings.map((b) => ({
    id: b.id,
    createdAt: b.createdAt,
    name: b.name,
    phone: b.phone,
    departmentId: b.departmentId,
    department: departmentName.get(b.departmentId) ?? a.anyDepartment,
    doctor: b.doctorId ? doctorName.get(b.doctorId) : undefined,
    source: b.source ? sourceLabels[b.source] ?? b.source : undefined,
    status: b.status,
    note: b.note,
    agent: b.agent,
    updatedAt: b.updatedAt,
    history: b.history ?? [],
  }));

  const labels: BoardLabels = {
    statuses: statusLabels,
    all: a.allRequests,
    search: a.searchBookings,
    allDepartments: a.allDepartments,
    department: a.department,
    periodAll: a.periodAll,
    periodToday: a.periodToday,
    periodWeek: a.periodWeek,
    agentName: a.agentName,
    agentPlaceholder: a.agentPlaceholder,
    note: a.bookingNote,
    notePlaceholder: a.bookingNotePlaceholder,
    save: a.saveStatus,
    saved: a.savedStatus,
    saveFailed: a.saveFailed,
    empty: a.noBookings,
    noMatches: a.noBookingMatches,
    receivedAt: a.receivedAt,
    updatedBy: a.updatedBy,
    history: a.statusHistory,
    fromPage: a.fromPage,
    doctor: a.bookingDoctor,
    refresh: a.refreshNow,
    autoRefresh: a.autoRefresh,
    call: a.callAction,
    whatsapp: a.whatsappAction,
    copy: a.copyLink,
    copied: a.copied,
    results: a.bookingResults,
    newLabel: a.newRequests,
    colTime: a.bookingColTime,
    colName: a.bookingColName,
    colPhone: a.bookingColPhone,
    colStatus: a.bookingColStatus,
    colActions: a.bookingColActions,
  };

  return {
    dict,
    bookings: list,
    departments: departments.map((d) => ({ id: d.id, name: ar ? d.nameAr : d.nameEn })),
    labels,
  };
}
