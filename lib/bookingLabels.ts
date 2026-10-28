import type { Dictionary } from "./dictionaries";
import type { BookingFormLabels } from "@/components/BookingForm";

/** The booking form's texts, from the (editable) site dictionary. */
export function bookingFormLabels(dict: Dictionary): BookingFormLabels {
  const b = dict.booking;
  return {
    name: b.formName,
    phone: b.formPhone,
    phonePlaceholder: b.formPhonePlaceholder,
    department: b.formDepartment,
    departmentAny: b.formDepartmentAny,
    doctor: b.formDoctor,
    doctorAny: b.formDoctorAny,
    branch: b.formBranch,
    branchAny: b.formBranchAny,
    submit: b.formSubmit,
    sending: b.formSending,
    successTitle: b.formSuccessTitle,
    successBody: b.formSuccessBody,
    another: b.formAnother,
    errorName: b.formErrorName,
    errorPhone: b.formErrorPhone,
    errorServer: b.formErrorServer,
    orCall: b.formOrCall,
    privacy: b.formPrivacy,
    bookingPhone: b.phone,
  };
}
