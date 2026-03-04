import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();

  const res = NextResponse.json({ ok: true });

  const cookieNames = [
    "sb-access-token",
    "sb-refresh-token",
    "sb-auth-token",
    "sb-provider-token",
    "sb-provider-refresh-token",
  ];

  for (const name of cookieNames) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }

  return res;
}