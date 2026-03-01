export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type Range = "all" | "7d" | "30d";
type StatusFilter = "all" | "won" | "lost";

function parseRange(v: string | null): Range {
  const s = String(v ?? "").toLowerCase();
  if (s === "7d" || s === "7") return "7d";
  if (s === "30d" || s === "30") return "30d";
  return "all";
}

function parseStatus(v: string | null): StatusFilter {
  const s = String(v ?? "").toLowerCase();
  if (s === "won") return "won";
  if (s === "lost") return "lost";
  return "all";
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function parseNumber(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseYmd(v: string | null): string | null {
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function startOfDayIso(ymdStr: string): string {
  return new Date(`${ymdStr}T00:00:00.000Z`).toISOString();
}

function endOfDayIso(ymdStr: string): string {
  return new Date(`${ymdStr}T23:59:59.999Z`).toISOString();
}

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const range = parseRange(url.searchParams.get("range"));
  const status = parseStatus(url.searchParams.get("status"));
  const minStake = parseNumber(url.searchParams.get("minStake"));
  const from = parseYmd(url.searchParams.get("from"));
  const to = parseYmd(url.searchParams.get("to"));

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sinceIso =
    range === "7d" ? isoDaysAgo(7) : range === "30d" ? isoDaysAgo(30) : null;

  let q = supabase
    .from("bets")
    .select("created_at,status,stake,profit_loss")
    .eq("user_id", user.id)
    .in("status", ["won", "lost"])
    .order("created_at", { ascending: true });

  if (sinceIso) q = q.gte("created_at", sinceIso);
  if (status !== "all") q = q.eq("status", status);
  if (minStake !== null) q = q.gte("stake", minStake);
  if (from) q = q.gte("created_at", startOfDayIso(from));
  if (to) q = q.lte("created_at", endOfDayIso(to));

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];

  const header = ["created_at", "status", "stake", "profit_loss"].join(",");
  const lines = rows.map((r: any) =>
    [
      csvEscape(r.created_at),
      csvEscape(r.status),
      csvEscape(r.stake),
      csvEscape(r.profit_loss),
    ].join(",")
  );

  const csv = [header, ...lines].join("\n");

  const filename = `bets_${range}_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}