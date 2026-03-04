import EquityChart from "@/components/EquityChart";
import { buildEquityCurve } from "@/lib/equity";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatMoney(currency: string, n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);
}

function formatPct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

type RpcPayload = {
  settings: { starting_bankroll: number; currency: string };
  summary: {
    settled_pl: number;
    open_exposure: number;
    total_settled: number;
    wins: number;
    losses: number;
    voids: number;
  };
  settled_bets: Array<{ settled_at: string; profit_loss: number }>;
};

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await supabaseServer();

  const { data, error } = await supabase.rpc("get_public_dashboard", {
    p_token: token,
  });

  if (error) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <div className="text-sm text-red-700">Public report error: {error.message}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <div className="text-lg font-semibold">Report not found</div>
        <div className="mt-2 text-sm text-slate-600">
          This link is invalid or has been revoked.
        </div>
      </div>
    );
  }

  const payload = data as unknown as RpcPayload;

  const currency = payload.settings?.currency || "GBP";
  const startingBankroll = Number(payload.settings?.starting_bankroll || 0);

  const settledBets = (payload.settled_bets ?? [])
    .map((b) => ({
      settled_at: String(b.settled_at),
      profit_loss: Number(b.profit_loss ?? 0),
    }))
    .sort(
      (a, b) =>
        new Date(a.settled_at).getTime() -
        new Date(b.settled_at).getTime()
    );

  const bankrollNow =
    startingBankroll + Number(payload.summary?.settled_pl ?? 0);

  const { points, stats } = buildEquityCurve({
    startingBankroll,
    settledBets,
  });

  const totalSettled = payload.summary?.total_settled ?? 0;
  const wins = payload.summary?.wins ?? 0;
  const losses = payload.summary?.losses ?? 0;
  const winRate = totalSettled > 0 ? wins / totalSettled : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6">
        <div className="text-2xl font-bold">Performance</div>
        <div className="mt-1 text-sm text-slate-600">
          Read-only summary based on settled bets (won/lost/void).
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Bankroll now
          </div>
          <div className="mt-2 text-2xl font-bold">
            {formatMoney(currency, bankrollNow)}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Start: {formatMoney(currency, startingBankroll)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Settled P/L
          </div>
          <div className="mt-2 text-2xl font-bold">
            {formatMoney(currency, Number(payload.summary?.settled_pl ?? 0))}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Won / Lost / Void
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Win rate
          </div>
          <div className="mt-2 text-2xl font-bold">{formatPct(winRate)}</div>
          <div className="mt-1 text-sm text-slate-600">
            {wins}W / {losses}L / {payload.summary?.voids ?? 0}V
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Max drawdown
          </div>
          <div className="mt-2 text-2xl font-bold">
            {formatPct(stats.maxDrawdownPct)}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            From peak to trough
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Equity curve</div>
            <div className="mt-1 text-sm text-slate-600">
              {points.length} points
            </div>
          </div>
        </div>

        <EquityChart points={points} currency={currency} />
      </div>
    </div>
  );
}