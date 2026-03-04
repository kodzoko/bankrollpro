export type TimeRangeKey = "all" | "7" | "30";

export type BetRow = {
  id: string;
  placed_at: string;
  status: "pending" | "won" | "lost" | "void";
  stake: number | null;
  odds: number | null;
  profit_loss: number | null; // NOT NULL in your DB, but keep nullable in type
};

export type RiskMetrics = {
  bankrollNow: number;
  startingBankroll: number;
  settledPL: number;

  openExposure: number;
  exposurePct: number;

  riskLevel: "LOW" | "MEDIUM" | "HIGH";
};

function n(x: any) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

export function computeRiskMetrics(args: {
  startingBankroll: number;
  bets: BetRow[];
}): RiskMetrics {
  const startingBankroll = n(args.startingBankroll);

  const settled = args.bets.filter((b) => b.status === "won" || b.status === "lost" || b.status === "void");
  const pending = args.bets.filter((b) => b.status === "pending");

  const settledPL = settled.reduce((sum, b) => sum + n(b.profit_loss), 0);
  const bankrollNow = startingBankroll + settledPL;

  const openExposure = pending.reduce((sum, b) => sum + n(b.stake), 0);

  const exposurePct = bankrollNow > 0 ? openExposure / bankrollNow : 0;

  let riskLevel: RiskMetrics["riskLevel"] = "LOW";
  if (exposurePct >= 0.2) riskLevel = "HIGH";
  else if (exposurePct >= 0.1) riskLevel = "MEDIUM";

  return {
    bankrollNow,
    startingBankroll,
    settledPL,
    openExposure,
    exposurePct,
    riskLevel,
  };
}