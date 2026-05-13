import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/auth";
import { getAbout, saveAbout } from "@/lib/storage";

export async function GET() {
  const about = await getAbout();
  return NextResponse.json({ about });
}

export async function PUT(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await request.json();
  await saveAbout(payload);
  return NextResponse.json({ ok: true });
}
