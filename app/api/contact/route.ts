import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createInquiry, getDepartment } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    typeof body.mobile !== "string" ||
    typeof body.departmentId !== "string" ||
    !body.name.trim() ||
    !body.mobile.trim() ||
    !getDepartment(body.departmentId)
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  createInquiry({
    name: body.name.trim(),
    mobile: body.mobile.trim(),
    departmentId: body.departmentId,
  });

  revalidatePath("/en/admin/inquiries");
  revalidatePath("/ar/admin/inquiries");
  revalidatePath("/en/admin");
  revalidatePath("/ar/admin");

  return NextResponse.json({ ok: true });
}
