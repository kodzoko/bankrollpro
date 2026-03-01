import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  const resolved =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<{ token: string }>)
      : (params as { token: string });

  const token = resolved.token;

  const { data: report, error } = await supabaseAdmin
    .from("reports")
    .select("id, token, owner_user_id, range, filters, revoked_at, expires_at, created_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 }
    );
  }

  if (!report) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // 410 if revoked
  if (report.revoked_at) {
    return NextResponse.json(
      { error: "revoked", revoked_at: report.revoked_at },
      { status: 410 }
    );
  }

  // 410 if expired
  if (report.expires_at) {
    const exp = new Date(report.expires_at).getTime();
    if (Number.isFinite(exp) && Date.now() > exp) {
      return NextResponse.json(
        { error: "expired", expires_at: report.expires_at },
        { status: 410 }
      );
    }
  }

  // Fetch rows according to snapshot filters (best-effort)
  // NOTE: Column names in your DB: placed_at, status, stake, profit_loss, odds, selection, event_name, market, sport
  const f = (report.filters ?? {}) as Record<string, any>;
  const status = typeof f.status === "string" && f.status.length ? f.status : null;
  const minStake =
    typeof f.minStake === "number"
      ? f.minStake
      : typeof f.minStake === "string" && f.minStake.length
      ? Number(f.minStake)
      : null;

  const from = typeof f.from === "string" && f.from.length ? f.from : null;
  const to = typeof f.to === "string" && f.to.length ? f.to : null;

  let q = supabaseAdmin
    .from("bets")
    .select(
      "id, placed_at, status, stake, profit_loss, odds, selection, event_name, market, sport"
    )
    .eq("user_id", report.owner_user_id)
    .order("placed_at", { ascending: false })
    .limit(200);

  if (status) q = q.eq("status", status);
  if (Number.isFinite(minStake as any) && (minStake as number) > 0) q = q.gte("stake", minStake as number);

  // Dates: keep simple. If your placed_at is timestamptz, this still works as strings.
  if (from) q = q.gte("placed_at", from);
  if (to) q = q.lte("placed_at", to);

  const { data: rows, error: rowsError } = await q;

  if (rowsError) {
    // still return report; rows error is useful for debugging
    return NextResponse.json(
      {
        report,
        rows: [],
        rows_error: rowsError.message,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ report, rows: rows ?? [] });
}