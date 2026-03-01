"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Report = {
  id: string;
  token: string;
  range: string;
  filters: Record<string, any>;
  revoked_at: string | null;
  expires_at: string | null;
  created_at: string;
};

function buildFiltersSnapshot(sp: URLSearchParams) {
  const status = sp.get("status") ?? "all";
  const minStake = sp.get("minStake") ?? "";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  return { status, minStake, from, to };
}

function snapshotText(filters: Record<string, any>) {
  const status = filters?.status ?? "all";
  const minStake = filters?.minStake ?? "";
  const from = filters?.from ?? "";
  const to = filters?.to ?? "";
  return `status=${status} | minStake=${minStake} | from=${from} | to=${to}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

function expiryToIso(choice: string) {
  if (choice === "none") return null;
  const now = Date.now();
  const add =
    choice === "1h" ? 60 * 60 * 1000 :
    choice === "24h" ? 24 * 60 * 60 * 1000 :
    choice === "7d" ? 7 * 24 * 60 * 60 * 1000 :
    null;
  if (!add) return null;
  return new Date(now + add).toISOString();
}

export default function ShareReportButton({ range }: { range: string }) {
  const sp = useSearchParams();

  const filters = useMemo(() => {
    const usp = new URLSearchParams(sp?.toString() ?? "");
    return buildFiltersSnapshot(usp);
  }, [sp]);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [err, setErr] = useState<string | null>(null);

  const [report, setReport] = useState<Report | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");

  const [expiryChoice, setExpiryChoice] = useState<"none" | "1h" | "24h" | "7d">("none");
  const [workingExpiry, setWorkingExpiry] = useState(false);
  const [workingRevoke, setWorkingRevoke] = useState(false);

  async function createShare() {
    setErr(null);
    setLoading(true);
    setCopyState("idle");
    try {
      const r = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ range, filters }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || "failed");

      const rep = j.report as Report;
      setReport(rep);

      const base = window.location.origin;
      const url = `${base}/report/${rep.token}`;
      setShareUrl(url);
      setOpen(true);
    } catch (e: any) {
      setErr(e?.message || "failed");
    } finally {
      setLoading(false);
    }
  }

  async function doCopy() {
    setCopyState("idle");
    try {
      if (!shareUrl) return;
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      // fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopyState("copied");
        setTimeout(() => setCopyState("idle"), 1200);
      } catch {
        setCopyState("failed");
      }
    }
  }

  async function updateExpiry(choice: "none" | "1h" | "24h" | "7d") {
    if (!report) return;
    setExpiryChoice(choice);
    setWorkingExpiry(true);
    setErr(null);
    try {
      const expires_at = expiryToIso(choice);
      const r = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expires_at }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || "failed");
      setReport(j.report as Report);
    } catch (e: any) {
      setErr(`Expiry update failed: ${e?.message || "failed"}`);
    } finally {
      setWorkingExpiry(false);
    }
  }

  async function revoke() {
    if (!report) return;
    setWorkingRevoke(true);
    setErr(null);
    try {
      const r = await fetch(`/api/reports/${report.id}/revoke`, {
        method: "POST",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || "failed");
      setReport(j.report as Report);
    } catch (e: any) {
      setErr(`Revoke failed: ${e?.message || "failed"}`);
    } finally {
      setWorkingRevoke(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={createShare}
        disabled={loading}
        style={ui.primaryBtn}
      >
        {loading ? "Sharing..." : "Share"}
      </button>

      {err ? <div style={ui.err}>{err}</div> : null}

      {open ? (
        <div style={ui.backdrop} onMouseDown={() => setOpen(false)}>
          <div style={ui.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={ui.modalTop}>
              <div>
                <div style={ui.modalTitle}>Share link</div>
                <div style={ui.modalSub}>Read-only report link (filters snapshot included)</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} style={ui.primaryBtn}>
                Close
              </button>
            </div>

            <div style={ui.block}>
              <div style={ui.label}>Link</div>
              <div style={ui.row}>
                <input value={shareUrl} readOnly style={ui.input} />
                <button type="button" onClick={doCopy} style={ui.primaryBtn}>
                  {copyState === "copied" ? "Copied" : "Copy"}
                </button>
              </div>
              {copyState === "failed" ? (
                <div style={ui.err}>Copy failed (browser permission). Select and copy manually.</div>
              ) : null}
            </div>

            <div style={ui.grid2}>
              <div style={ui.kv}>
                <div style={ui.k}>Range</div>
                <div style={ui.v}>{report?.range ?? range}</div>
              </div>

              <div style={ui.kv}>
                <div style={ui.k}>Expiry</div>
                <div style={ui.row}>
                  <select
                    value={expiryChoice}
                    onChange={(e) => updateExpiry(e.target.value as any)}
                    disabled={!report || workingExpiry || !!report?.revoked_at}
                    style={ui.select}
                  >
                    <option value="none">No expiry</option>
                    <option value="1h">1 hour</option>
                    <option value="24h">24 hours</option>
                    <option value="7d">7 days</option>
                  </select>

                  <button
                    type="button"
                    onClick={revoke}
                    disabled={!report || workingRevoke || !!report?.revoked_at}
                    style={{
                      ...ui.dangerBtn,
                      opacity: !report || workingRevoke || !!report?.revoked_at ? 0.6 : 1,
                    }}
                  >
                    {report?.revoked_at ? "Revoked" : (workingRevoke ? "Revoking..." : "Revoke")}
                  </button>
                </div>

                {report?.expires_at ? (
                  <div style={ui.small}>Expires: {fmtDate(report.expires_at)}</div>
                ) : (
                  <div style={ui.small}>No expiry</div>
                )}

                {report?.revoked_at ? (
                  <div style={ui.small}>Revoked: {fmtDate(report.revoked_at)}</div>
                ) : null}
              </div>
            </div>

            <div style={ui.block}>
              <div style={ui.label}>Snapshot</div>
              <div style={ui.snapshotBox}>
                {snapshotText(report?.filters || filters)}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

const ui: Record<string, any> = {
  primaryBtn: {
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #0f172a",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.10)",
  },
  dangerBtn: {
    background: "#111827",
    color: "#fff",
    border: "1px solid #111827",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.10)",
  },
  err: { marginTop: 8, color: "#b91c1c", fontSize: 13 },
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(2, 6, 23, 0.45)", // opaque enough
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    zIndex: 50,
  },
  modal: {
    width: "min(920px, 100%)",
    background: "#fff",
    borderRadius: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 20px 60px rgba(2, 6, 23, 0.35)",
    padding: 18,
  },
  modalTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  modalTitle: { fontSize: 24, fontWeight: 900, marginBottom: 4, color: "#0f172a" },
  modalSub: { color: "#475569", fontSize: 14 },
  block: { marginTop: 14 },
  label: { fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 6 },
  row: { display: "flex", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: "0 12px",
    fontSize: 14,
    background: "#fff",
  },
  select: {
    height: 44,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: "0 12px",
    fontSize: 14,
    background: "#fff",
    minWidth: 200,
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginTop: 14 },
  kv: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 12,
    background: "#fbfdff",
  },
  k: { fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 6 },
  v: { fontSize: 14, fontWeight: 800, color: "#0f172a" },
  small: { marginTop: 8, color: "#64748b", fontSize: 12 },
  snapshotBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    background: "#f8fafc",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 13,
    color: "#0f172a",
  },
};