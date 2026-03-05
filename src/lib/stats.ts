export function calculateStats(bets: any[]) {
  const settled = bets.filter(
    (b) => b.status === "won" || b.status === "lost"
  )

  const won = settled.filter((b) => b.status === "won").length
  const lost = settled.filter((b) => b.status === "lost").length

  const totalStakes = settled.reduce((sum, b) => sum + Number(b.stake), 0)

  const totalProfit = settled.reduce((sum, b) => {
    if (b.status === "won") {
      return sum + (b.odds - 1) * b.stake
    }
    if (b.status === "lost") {
      return sum - b.stake
    }
    return sum
  }, 0)

  const roi =
    totalStakes > 0 ? (totalProfit / totalStakes) * 100 : 0

  const winRate =
    settled.length > 0 ? (won / settled.length) * 100 : 0

  return {
    won,
    lost,
    totalStakes,
    totalProfit,
    roi,
    winRate
  }
}