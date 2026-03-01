import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Eğer sende farklı token üretimi varsa bunu aynen bırakabilirsin.
// Buradaki sadece örnek; sende makeToken() başka dosyadaysa import et.
function makeToken() {
  // URL-safe token
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/**
 * GET /api/reports?limit=10
 * Auth user'ın son paylaşımlarını listeler
 */
export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "10") || 10, 50);

  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("id, token, range, filters, revoked_at, expires_at, created_at")
    .eq("owner_user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: "db_error", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ reports: data ?? [] });
}

/**
 * POST /api/reports
 * body: { range: "all"|"7d"|"30d", filters?: {...} }
 */
export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const range = body?.range ?? "all";
  const filters = body?.filters ?? {};

  const { data: report, error } = await supabaseAdmin
    .from("reports")
    .insert({
      owner_user_id: auth.user.id,
      range,
      filters,
      token: makeToken(),
    })
    .select("id, token, range, filters, revoked_at, expires_at, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message, details: (error as any).details },
      { status: 500 }
    );
  }

  return NextResponse.json({ report });
}