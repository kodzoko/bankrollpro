export interface KellyResult {
  edge: number; // EV per unit stake (e.g. 0.05 = +5%)
  rawKelly: number; // full Kelly fraction (before fractional)
  fraction: number; // after fractional multiplier
  recommendedStake: number; // after max cap
  uncappedStake: number; // before max cap
  capped: boolean;
}

export function calculateKelly(
  bankroll: number,
  odds: number,
  probability: number,
  fractional: number,
  maxPercent: number
): KellyResult {
  const b = odds - 1;
  const p = probability;
  const q = 1 - p;

  // EV per 1 unit staked: p*b - q
  const edge = b * p - q;

  // Kelly fraction
  const rawKelly = b === 0 ? -1 : edge / b;

  if (rawKelly <= 0 || !Number.isFinite(rawKelly)) {
    return {
      edge,
      rawKelly,
      fraction: 0,
      recommendedStake: 0,
      uncappedStake: 0,
      capped: false,
    };
  }

  const fraction = rawKelly * fractional;
  const uncappedStake = bankroll * fraction;

  const maxStake = bankroll * maxPercent;
  const cappedStake = uncappedStake > maxStake ? maxStake : uncappedStake;

  return {
    edge,
    rawKelly,
    fraction,
    recommendedStake: cappedStake,
    uncappedStake,
    capped: uncappedStake > maxStake,
  };
}
