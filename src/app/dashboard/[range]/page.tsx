import Link from "next/link";
import { redirect } from "next/navigation";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

import BetsFilters from "./BetsFilters";
import ShareReportButton from "./ShareReportButton";
import RecentSharesPanel from "./RecentSharesPanel";

function parseRange(raw?: string) {
  const r = (raw ?? "all").toLowerCase();
  if (r === "7d" || r === "30d" || r === "all") return r;
  return "all";
}

function getDaysForRange(range: string) {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  return null;
}

function safeNumber(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function formatGBP(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

type RiskLevel = "green" | "yellow" | "red";

function getRisk(bankroll: number, stakedPct: number, betCount: number) {
  // Rules:
  // bankroll <= 0  -> 🔴
  // stakedPct > 25 -> 🔴
  // 10–25          -> 🟡
  // <10            -> 🟢 (but if bet count < 5 -> 🟡)

  if (bankroll <= 0) {
    return { level: "red" as RiskLevel, label: "High risk", emoji: "🔴", note: "Bankroll is 0 (or below)." };
  }
  if (stakedPct > 25) {
    return { level: "red" as RiskLevel, label: "High risk", emoji: "🔴", note: "Exposure is above 25% of bankroll." };
  }
  if (stakedPct >= 10 && stakedPct <= 25) {
    return { level: "yellow" as RiskLevel, label: "Medium risk", emoji: "🟡", note: "Exposure is between 10% and 25% of bankroll." };
  }
  if (betCount < 5) {
    return { level: "yellow" as RiskLevel, label: "Medium risk", emoji: "🟡", note: "Low exposure, but insufficient sample size (< 5 bets)." };
  }
  return { level: "green" as RiskLevel, label: "Low risk", emoji: "🟢", note: "Exposure is below 10% of bankroll." };
}

function riskPillClass(level: RiskLevel) {
  if (level === "red") return "bg-red-50 text-red-700 border-red-200";
  if (level === "yellow") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function disciplinePill(score: number) {
  if (score >= 80) {
    return { emoji: "🟢", label: "Strong discipline", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (score >= 60) {
    return { emoji: "🟡", label: "Moderate discipline", className: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  return { emoji: "🔴", label: "Weak discipline", className: "bg-red-50 text-red-700 border-red-200" };
}

function tabClass(active: boolean) {
  return active
    ? "rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 text-sm text-white"
    : "rounded-xl border bg-white px-3 py-2 text-sm hover:bg-slate-50";
}

export default async function DashboardRangePage({
  params,
  searchParams,
}: {
  params: Promise<{ range?: string }> | { range?: string };
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}) {
  const resolvedParams =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<{ range?: string }>)
      : (params as { range?: string });

  const resolvedSearch =
    typeof (searchParams as any)?.then === "function"
      ? await (searchParams as Promise<Record<string, any>>)
      : (searchParams as Record<string, any> | undefined);

  const range = parseRange(resolvedParams?.range);

  // ✅ HARD GUARD
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user?.id) redirect("/login");

  const userId = auth.user.id;

  // Filters from URL
  const status = (resolvedSearch?.status as string) || "all";
  const minStake = (resolvedSearch?.minStake as string) || "";
  const from = (resolvedSearch?.from as string) || "";
  const to = (resolvedSearch?.to as string) || "";

  // Date range from `range`
  const days = getDaysForRange(range);
  const now = new Date();
  const rangeFrom = days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : null;

  // Bets query
  let q = supabaseAdmin
    .from("bets")
    .select("id, placed_at, status, stake, profit_loss, odds, selection", { count: "exact" })
    .eq("user_id", userId);

  if (days && rangeFrom) q = q.gte("placed_at", rangeFrom.toISOString());
  if (status && status !== "all") q = q.eq("status", status);
  if (minStake) q = q.gte("stake", Number(minStake));
  if (from) q = q.gte("placed_at", new Date(from).toISOString());
  if (to) q = q.lte("placed_at", new Date(to).toISOString());

  q = q.order("placed_at", { ascending: false }).limit(200);

  const { data: rowsRaw } = await q;
  const rows = rowsRaw ?? [];

  // Bankroll
  const { data: accountsRaw } = await supabaseAdmin
    .from("bookmaker_accounts")
    .select("current_balance, currency")
    .eq("user_id", userId);

  const accounts = accountsRaw ?? [];
  const bankroll = accounts.reduce((acc: number, a: any) => acc + safeNumber(a.current_balance), 0);

  // Metrics
  const settledCount = rows.length;
  const totalStaked = rows.reduce((a: number, b: any) => a + safeNumber(b.stake), 0);
  const settledProfit = rows.reduce((a: number, b: any) => a + safeNumber(b.profit_loss), 0);
  const roi = totalStaked > 0 ? (settledProfit / totalStaked) * 100 : 0;
  const wins = rows.filter((r: any) => r.status === "won").length;
  const winRate = settledCount > 0 ? (wins / settledCount) * 100 : 0;

  const stakedPctOfBankroll = bankroll > 0 ? (totalStaked / bankroll) * 100 : 0;
  const risk = getRisk(bankroll, stakedPctOfBankroll, settledCount);

  // Discipline Score (v1)
  const maxStake = rows.reduce((max: number, r: any) => Math.max(max, safeNumber(r.stake)), 0);
  const maxStakePct = bankroll > 0 ? (maxStake / bankroll) * 100 : 0;

  let currentLossStreak = 0;
  for (const r of rows) {
    if (r.status === "lost") currentLossStreak++;
    else break;
  }

  let disciplineScore = 100;

  if (stakedPctOfBankroll > 25) disciplineScore -= 25;
  else if (stakedPctOfBankroll > 15) disciplineScore -= 15;
  else if (stakedPctOfBankroll > 10) disciplineScore -= 10;

  if (maxStakePct > 15) disciplineScore -= 20;
  else if (maxStakePct > 10) disciplineScore -= 10;

  if (currentLossStreak >= 5) disciplineScore -= 25;
  else if (currentLossStreak >= 3) disciplineScore -= 15;

  if (disciplineScore < 0) disciplineScore = 0;

  const discipline = disciplinePill(disciplineScore);

  // Why text
  const reasons: string[] = [];
  if (bankroll <= 0) reasons.push("bankroll is 0");
  if (stakedPctOfBankroll > 10) reasons.push("high exposure");
  if (maxStakePct > 10) reasons.push("large single stake");
  if (currentLossStreak >= 3) reasons.push("loss streak");
  const why = reasons.length ? reasons.join(", ") : "stable exposure and sizing";

  // Daily PnL
  const pnlByDay = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.placed_at);
    const key = d.toISOString().slice(0, 10);
    pnlByDay.set(key, (pnlByDay.get(key) ?? 0) + safeNumber(r.profit_loss));
  }
  const daily = Array.from(pnlByDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, pnl]) => ({ day, pnl }));

  // Recent shares
  const { data: recentShares } = await supabaseAdmin
    .from("reports")
    .select("id, token, range, filters, revoked_at, expires_at, created_at")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  const linkAll = "/dashboard/all";
  const link7d = "/dashboard/7d";
  const link30d = "/dashboard/30d";

  const activeFiltersText = `status=${status || "all"} | minStake=${minStake || "—"} | from=${from || "—"} | to=${to || "—"}`;

  const activeAll = range === "all";
  const active7d = range === "7d";
  const active30d = range === "30d";

  return (
    <main className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="mt-1 text-sm text-slate-600">
            Current range:{" "}
            <span className="font-semibold">{range === "all" ? "All Time" : range}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ShareReportButton range={range} />
          <Link className={tabClass(activeAll)} href={linkAll}>All Time</Link>
          <Link className={tabClass(active7d)} href={link7d}>Last 7 Days</Link>
          <Link className={tabClass(active30d)} href={link30d}>Last 30 Days</Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filters</h2>
          <div className="text-xs text-slate-500">
            Tip: Filters are in the URL, so you can share the exact view.
          </div>
        </div>

        {/* ✅ BetsFilters prop fix (build için) */}
        <BetsFilters currentRange={range} />

        <div className="mt-3 text-xs text-slate-600">
          Active Filters: <span className="font-mono">{activeFiltersText}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs text-slate-500">Settled Bets</div>
          <div className="mt-1 text-2xl font-bold">{settledCount}</div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs text-slate-500">Total Staked</div>
          <div className="mt-1 text-2xl font-bold">{formatGBP(totalStaked)}</div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs text-slate-500">Settled Profit</div>
          <div className="mt-1 text-2xl font-bold">{formatGBP(settledProfit)}</div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs text-slate-500">ROI</div>
          <div className="mt-1 text-2xl font-bold">{roi.toFixed(2)}%</div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm md:col-span-2">
          <div className="text-xs text-slate-500">Win Rate</div>
          <div className="mt-1 text-2xl font-bold">{winRate.toFixed(2)}%</div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm md:col-span-2">
          <div className="text-xs text-slate-500">Rows</div>
          <div className="mt-1 text-2xl font-bold">{rows.length}</div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm md:col-span-2">
          <div className="text-xs text-slate-500">Bankroll</div>
          <div className="mt-1 text-2xl font-bold">{formatGBP(bankroll)}</div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm md:col-span-2">
          <div className="text-xs text-slate-500">Total Staked / Bankroll</div>
          <div className="mt-1 text-2xl font-bold">{stakedPctOfBankroll.toFixed(2)}%</div>
        </div>

        {/* Discipline */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm md:col-span-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500">Bankroll Discipline Score</div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${discipline.className}`}>
                  <span>{discipline.emoji}</span>
                  <span className="font-semibold">{discipline.label}</span>
                </span>
                <span className="text-sm text-slate-600">{why}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold">{disciplineScore} / 100</div>
              <div className="mt-1 text-sm text-slate-600">
                Max stake: {maxStakePct.toFixed(2)}% | Loss streak: {currentLossStreak}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm md:col-span-2">
          <div className="text-xs text-slate-500">Risk</div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${riskPillClass(risk.level)}`}>
              <span>{risk.emoji}</span>
              <span className="font-semibold">{risk.label}</span>
            </span>
            <span className="text-sm text-slate-600">{risk.note}</span>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Rules: bankroll ≤ 0 → High risk | exposure &gt; 25% → High risk | 10–25% → Medium risk | &lt; 10% → Low risk (but &lt; 5 bets → Medium risk)
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs text-slate-500">Current</div>
          <div className="mt-2 text-sm text-slate-700">
            <div><span className="font-semibold">Staked:</span> {formatGBP(totalStaked)}</div>
            <div><span className="font-semibold">Bankroll:</span> {formatGBP(bankroll)}</div>
            <div><span className="font-semibold">Ratio:</span> {stakedPctOfBankroll.toFixed(2)}%</div>
            <div><span className="font-semibold">Bets:</span> {settledCount}</div>
          </div>
        </div>
      </div>

      {/* Daily PnL */}
      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Daily PnL ({range === "all" ? "All Time" : range})</h2>
          <div className="text-xs text-slate-500">Days: {daily.length} | Rows: {rows.length}</div>
        </div>

        {daily.length === 0 ? (
          <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">No data for this range.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[520px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="border-b py-2 pr-3">Day</th>
                  <th className="border-b py-2 pr-3">Daily PnL</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d) => (
                  <tr key={d.day} className="text-sm">
                    <td className="border-b py-3 pr-3">{d.day}</td>
                    <td className="border-b py-3 pr-3">{formatGBP(d.pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Bets */}
      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-2">
          <h2 className="text-lg font-semibold">Recent Bets</h2>
          <div className="text-sm text-slate-600">Showing up to 200 rows</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="border-b py-2 pr-3">Created</th>
                <th className="border-b py-2 pr-3">Status</th>
                <th className="border-b py-2 pr-3">Stake</th>
                <th className="border-b py-2 pr-3">Profit</th>
                <th className="border-b py-2 pr-3">Odds</th>
                <th className="border-b py-2 pr-3">Selection</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="text-sm">
                  <td className="border-b py-3 pr-3">{new Date(r.placed_at).toLocaleString("en-GB")}</td>
                  <td className="border-b py-3 pr-3">{r.status}</td>
                  <td className="border-b py-3 pr-3">{formatGBP(safeNumber(r.stake))}</td>
                  <td className="border-b py-3 pr-3">{formatGBP(safeNumber(r.profit_loss))}</td>
                  <td className="border-b py-3 pr-3">{safeNumber(r.odds)}</td>
                  <td className="border-b py-3 pr-3">{r.selection}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="py-6 text-sm text-slate-600" colSpan={6}>
                    No bets found for this selection.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6">
        <RecentSharesPanel initial={(recentShares ?? []) as any} />
      </div>
    </main>
  );
}