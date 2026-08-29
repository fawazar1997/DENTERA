import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    typeof body.email !== "string" ||
    typeof body.message !== "string"
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // In production, wire this up to an email service or CRM.
  console.log("New contact message received:", {
    name: body.name,
    phone: body.phone,
    email: body.email,
    message: body.message,
  });

  return NextResponse.json({ ok: true });
}
