import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();

  // Optional: return JSON; cookies will be cleared by supabaseServer cookie adapter
  return NextResponse.json({ ok: true });
}