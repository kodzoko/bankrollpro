import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const enabled = body?.enabled === true;

  const res = NextResponse.json({ ok: true, enabled });

  // 30 gün
  res.cookies.set("bp_pro", enabled ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}