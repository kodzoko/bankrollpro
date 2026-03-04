// src/lib/equity.ts

export type SettledBetForEquity = {
  settled_at: string; // ISO
  profit_loss: number; // signed
};

export type EquityPoint = {
  date: string;   // ISO (we'll format in chart)
  equity: number; // bankroll after cumulative P/L
};

export type DrawdownStats = {
  peakBankroll: number;
  maxDrawdownPct: number;     // 0..1
  currentDrawdownPct: number; // 0..1
};

export function buildEquityCurve(args: {
  startingBankroll: number;
  settledBets: SettledBetForEquity[]; // must already be sorted by settled_at asc
}): { points: EquityPoint[]; stats: DrawdownStats } {
  const startingBankroll = Number(args.startingBankroll) || 0;
  const bets = Array.isArray(args.settledBets) ? args.settledBets : [];

  const points: EquityPoint[] = [];
  const startDate = bets.length ? bets[0].settled_at : new Date().toISOString();

  // Start point (baseline)
  let equity = startingBankroll;
  points.push({ date: startDate, equity });

  // Build curve
  for (const b of bets) {
    const pl = Number(b.profit_loss);
    equity += Number.isFinite(pl) ? pl : 0;
    points.push({ date: b.settled_at, equity });
  }

  // Drawdown stats
  let peak = -Infinity;
  let maxDD = 0;

  for (const p of points) {
    if (p.equity > peak) peak = p.equity;

    const dd = peak > 0 ? (peak - p.equity) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }

  const last = points[points.length - 1];
  const currentDD = peak > 0 ? (peak - last.equity) / peak : 0;

  return {
    points,
    stats: {
      peakBankroll: Number.isFinite(peak) ? peak : startingBankroll,
      maxDrawdownPct: Number.isFinite(maxDD) ? maxDD : 0,
      currentDrawdownPct: Number.isFinite(currentDD) ? currentDD : 0,
    },
  };
}