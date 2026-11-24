// node --test scripts/robot-safety.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { isForbidden } from "./robot-safety.mjs";

test("refuses anything that changes the source systems", () => {
  for (const t of [
    "Post",
    "Post to Accounting",
    "Unpost",
    "Cancel Day Post",
    "Report to Zatca",
    "Approve",
    "Save",
    "Delete",
    "Reverse Entry",
    "Edit",
    "New Journal Entry",
    "Add",
    "Import",
    "Close Period",
    "ترحيل",
    "إلغاء الترحيل",
    "اعتماد",
    "حفظ",
    "حذف",
    "تعديل",
    "قيد جديد",
    "إقفال الفترة",
  ]) {
    assert.equal(isForbidden(t), true, t);
  }
});

test("allows reading, filtering and exporting", () => {
  for (const t of [
    "Filters",
    "Apply Filters",
    "Apply Filters (SP)",
    "Apply Filters (Excel)",
    "Excel",
    "Excel (SP)",
    "Excel (Big Table)",
    "Run Report",
    "Search",
    "Print",
    "Show All Columns",
    "Show Unposted",
    "Show unposted entries",
    "عرض غير المرحّل",
    "عرض غير المرحل",
    "OK, continue",
  ]) {
    assert.equal(isForbidden(t), false, t);
  }
});
