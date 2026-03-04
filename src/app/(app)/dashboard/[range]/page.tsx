import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { computeRiskMetrics, type BetRow, type TimeRangeKey } from "@/lib/riskEngine";

import EquityChart from "@/components/EquityChart";
import { buildEquityCurve } from "@/lib/equity";

function formatMoney(currency: string, n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);
}

function formatPct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

function rangeDays(range: TimeRangeKey) {
  if (range === "7") return 7;
  if (range === "30") return 30;
  return null; // "all"
}

function rangeLabel(range: TimeRangeKey) {
  if (range === "7") return "7D";
  if (range === "30") return "30D";
  return "All";
}

function rangeBtnClass(active: boolean) {
  return active
    ? "rounded-xl bg-black px-3 py-2 text-sm text-white"
    : "rounded-xl border px-3 py-2 text-sm hover:bg-slate-50";
}

export default async function DashboardRangePage({
  params,
}: {
  params: Promise<{ range: TimeRangeKey }>;
}) {
  const { range } = await params;

  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  // 1) Load starting bankroll settings
  const { data: settings, error: settingsError } = await supabase
    .from("bankroll_settings")
    .select("starting_bankroll,currency")
    .eq("user_id", user.id)
    .maybeSingle();

  if (settingsError) {
    return (
      <main className="p-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="rounded-2xl border bg-white p-6">
            <div className="text-sm text-red-700">Settings query error: {settingsError.message}</div>
          </div>
        </div>
      </main>
    );
  }

  // If missing -> show CTA to settings page
  if (!settings?.starting_bankroll) {
    return (
      <main className="p-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="rounded-2xl border bg-white p-6">
            <h1 className="text-3xl font-bold">Set your starting bankroll</h1>
            <p className="mt-2 text-sm text-slate-600">
              BankrollPro uses this baseline for risk, exposure, and drawdown.
            </p>

            <Link
              href="/settings"
              className="mt-5 inline-flex items-center rounded-xl bg-black px-4 py-2 text-white"
            >
              Set starting bankroll
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const currency = settings.currency || "GBP";
  const startingBankroll = Number(settings.starting_bankroll) || 0;

  // 2) Load bets for range (by placed_at for risk/exposure metrics)
  const days = rangeDays(range);
  const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;

  let q = supabase
    .from("bets")
    .select("id, placed_at, status, stake, odds, profit_loss, settled_at")
    .eq("user_id", user.id)
    .order("placed_at", { ascending: false })
    .limit(2000);

  if (since) q = q.gte("placed_at", since);

  const { data: betsRaw, error: betsError } = await q;

  if (betsError) {
    return (
      <main className="p-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="rounded-2xl border bg-white p-6">
            <div className="text-sm text-red-700">Bets query error: {betsError.message}</div>
          </div>
        </div>
      </main>
    );
  }

  const bets = (betsRaw ?? []) as (BetRow & { settled_at?: string | null })[];

  // Risk / exposure metrics
  const m = computeRiskMetrics({ startingBankroll, bets });

  // 3) Equity curve + drawdown (settled bets only, range applies to settled_at)
  const settledBets = (bets ?? [])
    .filter((b) => b.status === "won" || b.status === "lost" || b.status === "void")
    .filter((b) => !!b.settled_at)
    .map((b) => ({
      settled_at: String(b.settled_at),
      profit_loss: Number(b.profit_loss ?? 0),
    }))
    .filter((b) => {
      if (!since) return true;
      return new Date(b.settled_at).getTime() >= new Date(since).getTime();
    })
    .sort((a, b) => new Date(a.settled_at).getTime() - new Date(b.settled_at).getTime());

  const { points: equityPoints, stats: dd } = buildEquityCurve({
    startingBankroll,
    settledBets,
  });

  const badge =
    m.riskLevel === "HIGH"
      ? "border-red-200 bg-red-50 text-red-700"
      : m.riskLevel === "MEDIUM"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <main className="p-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>

            <div className="mt-2 flex items-center gap-2">
              <div className="text-sm text-slate-600">
                Range: <span className="font-medium">{rangeLabel(range)}</span>
              </div>

              <div className="ml-3 flex gap-2">
                <Link href="/dashboard/all" className={rangeBtnClass(range === "all")}>
                  All
                </Link>
                <Link href="/dashboard/30" className={rangeBtnClass(range === "30")}>
                  30D
                </Link>
                <Link href="/dashboard/7" className={rangeBtnClass(range === "7")}>
                  7D
                </Link>
              </div>
            </div>
          </div>

          <div className={`w-fit rounded-xl border px-3 py-2 text-sm ${badge}`}>
            Risk: <span className="font-semibold">{m.riskLevel}</span>
          </div>
        </div>

        {/* Top metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Bankroll now</div>
            <div className="mt-2 text-2xl font-bold">{formatMoney(currency, m.bankrollNow)}</div>
            <div className="mt-1 text-sm text-slate-600">Start: {formatMoney(currency, m.startingBankroll)}</div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Settled P/L</div>
            <div className="mt-2 text-2xl font-bold">{formatMoney(currency, m.settledPL)}</div>
            <div className="mt-1 text-sm text-slate-600">Won/Lost/Void only</div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Open exposure</div>
            <div className="mt-2 text-2xl font-bold">{formatMoney(currency, m.openExposure)}</div>
            <div className="mt-1 text-sm text-slate-600">Pending stakes</div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Exposure %</div>
            <div className="mt-2 text-2xl font-bold">{formatPct(m.exposurePct)}</div>
            <div className="mt-1 text-sm text-slate-600">Exposure / bankroll now</div>
          </div>
        </div>

        {/* Drawdown cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Peak bankroll</div>
            <div className="mt-2 text-2xl font-bold">{formatMoney(currency, dd.peakBankroll)}</div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Max drawdown</div>
            <div className="mt-2 text-2xl font-bold">{formatPct(dd.maxDrawdownPct)}</div>
            <div className="mt-1 text-sm text-slate-600">From peak to trough</div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Current drawdown</div>
            <div className="mt-2 text-2xl font-bold">{formatPct(dd.currentDrawdownPct)}</div>
            <div className="mt-1 text-sm text-slate-600">Peak to now</div>
          </div>
        </div>

        {/* Equity curve */}
        <div className="mt-6 rounded-2xl border bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Equity curve</div>
              <div className="mt-1 text-sm text-slate-600">
                Based on settled bets (won/lost/void). Range applies to settlement date.
              </div>
            </div>
            <div className="text-sm text-slate-600">{equityPoints.length} points</div>
          </div>

          <EquityChart points={equityPoints} currency={currency} />
        </div>

        {/* Next box */}
        <div className="mt-6 rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Next</div>
              <div className="mt-1 text-sm text-slate-600">
                We can add a “risk-of-ruin” estimate and streak analytics next.
              </div>
            </div>

            <div className="flex gap-2">
              <Link href="/bets" className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50">
                Add/settle bets
              </Link>
              <Link href="/settings" className="rounded-xl bg-black px-4 py-2 text-sm text-white">
                Update bankroll
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}