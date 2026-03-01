import Link from "next/link";

type Report = {
  id: string;
  token: string;
  owner_user_id: string;
  range: string;
  filters: Record<string, any>;
  revoked_at: string | null;
  expires_at: string | null;
  created_at: string;
};

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

function snapshotText(filters: Record<string, any>) {
  const status = filters?.status ?? "all";
  const minStake = filters?.minStake ?? "";
  const from = filters?.from ?? "";
  const to = filters?.to ?? "";
  return `status=${status} | minStake=${minStake} | from=${from} | to=${to}`;
}

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const resolved =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<{ token: string }>)
      : (params as { token: string });

  const token = resolved.token;

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const res = await fetch(`${base}/api/report/${encodeURIComponent(token)}`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.h1}>Shared Report</h1>
          <p style={styles.muted}>This link does not exist.</p>
          <Link href="/dashboard/all">Go to dashboard</Link>
        </div>
      </div>
    );
  }

  if (res.status === 410) {
    const j = await res.json().catch(() => ({}));
    const reason = j?.error === "expired" ? "expired" : "revoked";
    const when = j?.expires_at ?? j?.revoked_at ?? null;

    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.titleRow}>
            <h1 style={styles.h1}>Shared Report</h1>
            <span style={styles.badge}>Read-only</span>
          </div>

          <div style={{ ...styles.alert, ...(reason === "expired" ? styles.alertWarn : styles.alertDanger) }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              This share link is {reason}.
            </div>
            {when ? (
              <div style={styles.mutedSmall}>
                {reason === "expired" ? "Expired" : "Revoked"} at: {fmtDate(when)}
              </div>
            ) : null}
          </div>

          <p style={styles.muted}>
            Ask the owner to generate a new share link from the dashboard.
          </p>

          <Link href="/dashboard/all">Go to dashboard</Link>
        </div>
      </div>
    );
  }

  const json = await res.json();
  const report: Report = json.report;
  const rows: any[] = Array.isArray(json.rows) ? json.rows : [];

  // quick metrics
  const settledCount = rows.length;
  const totalStaked = rows.reduce((a, b) => a + (Number(b.stake) || 0), 0);
  const settledProfit = rows.reduce((a, b) => a + (Number(b.profit_loss) || 0), 0);
  const roi = totalStaked > 0 ? (settledProfit / totalStaked) * 100 : 0;
  const wins = rows.filter((r) => r.status === "won").length;
  const winRate = settledCount > 0 ? (wins / settledCount) * 100 : 0;

  // Daily PnL buckets
  const pnlByDay = new Map<string, number>();
  for (const r of rows) {
    const d = r.placed_at ? new Date(r.placed_at) : null;
    const key = d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "unknown";
    const v = Number(r.profit_loss) || 0;
    pnlByDay.set(key, (pnlByDay.get(key) || 0) + v);
  }
  const daily = Array.from(pnlByDay.entries())
    .sort((a, b) => (a[0] > b[0] ? 1 : -1))
    .map(([day, pnl]) => ({ day, pnl }));

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerCard}>
          <div style={styles.titleRow}>
            <div>
              <h1 style={styles.h1}>Shared Report</h1>
              <div style={styles.mutedSmall}>Range: <b>{report.range}</b></div>
            </div>
            <span style={styles.badge}>Read-only</span>
          </div>

          <div style={styles.snapshotBox}>
            <div style={styles.snapshotTitle}>Snapshot</div>
            <div style={styles.snapshotText}>{snapshotText(report.filters || {})}</div>
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Settled Bets</div>
            <div style={styles.metricValue}>{settledCount}</div>
          </div>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Total Staked</div>
            <div style={styles.metricValue}>£{totalStaked.toFixed(2)}</div>
          </div>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Settled Profit</div>
            <div style={styles.metricValue}>£{settledProfit.toFixed(2)}</div>
          </div>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>ROI</div>
            <div style={styles.metricValue}>{roi.toFixed(2)}%</div>
          </div>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Win Rate</div>
            <div style={styles.metricValue}>{winRate.toFixed(2)}%</div>
          </div>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Rows</div>
            <div style={styles.metricValue}>{rows.length}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitleRow}>
            <div>
              <div style={styles.cardTitle}>Daily PnL</div>
              <div style={styles.mutedSmall}>Aggregated by day</div>
            </div>
            <div style={styles.mutedSmall}>Days: {daily.length} | Rows: {rows.length}</div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Day</th>
                  <th style={styles.th}>Daily PnL</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d) => (
                  <tr key={d.day}>
                    <td style={styles.td}>{d.day}</td>
                    <td style={styles.td}>£{d.pnl.toFixed(2)}</td>
                  </tr>
                ))}
                {daily.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={2}>No data</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>Recent Bets</div>
          <div style={styles.mutedSmall}>Showing up to 200 rows</div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Stake</th>
                  <th style={styles.th}>Profit</th>
                  <th style={styles.th}>Odds</th>
                  <th style={styles.th}>Selection</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={styles.td}>{r.placed_at ? new Date(r.placed_at).toLocaleString() : "-"}</td>
                    <td style={styles.td}>{r.status ?? "-"}</td>
                    <td style={styles.td}>£{Number(r.stake || 0).toFixed(2)}</td>
                    <td style={styles.td}>£{Number(r.profit_loss || 0).toFixed(2)}</td>
                    <td style={styles.td}>{r.odds ?? "-"}</td>
                    <td style={styles.td}>{r.selection ?? "-"}</td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={6}>No rows</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 10, color: "#6b7280", fontSize: 12 }}>
            This is a read-only share link. Data reflects the snapshot filters stored at creation time.
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  page: {
    background: "#f6f7fb",
    minHeight: "100vh",
    padding: "28px 16px",
  },
  container: { maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 },
  headerCard: {
    background: "#fff",
    borderRadius: 14,
    padding: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  h1: { margin: 0, fontSize: 28, letterSpacing: -0.2 },
  titleRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    height: 26,
    padding: "0 10px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    fontSize: 12,
    fontWeight: 700,
    color: "#0f172a",
    whiteSpace: "nowrap",
    marginTop: 4,
  },
  muted: { color: "#475569" },
  mutedSmall: { color: "#64748b", fontSize: 12, marginTop: 6 },
  snapshotBox: {
    marginTop: 14,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    background: "#fbfdff",
  },
  snapshotTitle: { fontWeight: 700, fontSize: 12, color: "#334155", marginBottom: 6 },
  snapshotText: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 13, color: "#0f172a" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
  },
  metric: {
    background: "#fff",
    borderRadius: 14,
    padding: 16,
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  metricLabel: { color: "#64748b", fontSize: 12, fontWeight: 700 },
  metricValue: { marginTop: 8, fontSize: 22, fontWeight: 800, color: "#0f172a" },
  cardTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 800, color: "#0f172a" },
  tableWrap: { overflowX: "auto", marginTop: 10, border: "1px solid #e5e7eb", borderRadius: 12 },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0 },
  th: {
    textAlign: "left",
    fontSize: 12,
    color: "#475569",
    padding: "10px 12px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f8fafc",
    position: "sticky",
    top: 0,
  },
  td: { fontSize: 13, color: "#0f172a", padding: "10px 12px", borderBottom: "1px solid #f1f5f9" },
  alert: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
  },
  alertWarn: { borderColor: "#fde68a", background: "#fffbeb" },
  alertDanger: { borderColor: "#fecaca", background: "#fef2f2" },
};