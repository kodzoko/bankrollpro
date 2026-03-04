"use client";

import { useEffect, useMemo, useState } from "react";

type ReportRow = {
  id: string;
  token: string;
  range: string;
  filters?: any;
  revoked_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB");
}

function relUrl(token: string) {
  return `/report/${token}`;
}

type Flash = { type: "success" | "error"; text: string } | null;

export default function RecentSharesPanel({ initial }: { initial: ReportRow[] }) {
  const [rows, setRows] = useState<ReportRow[]>(initial ?? []);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash>(null);

  // Avoid hydration mismatch: origin is client-only
  const [origin, setOrigin] = useState<string>("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // auto-hide flash
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2200);
    return () => clearTimeout(t);
  }, [flash]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
  }, [rows]);

  async function copyLink(token: string) {
    try {
      const full = origin ? `${origin}${relUrl(token)}` : relUrl(token);
      await navigator.clipboard.writeText(full);
      setFlash({ type: "success", text: "Copied link" });
    } catch {
      setFlash({ type: "error", text: "Copy failed" });
    }
  }

  function expiryLabel(r: ReportRow) {
    if (r.revoked_at) return "Revoked";
    if (!r.expires_at) return "No expiry";
    const exp = new Date(r.expires_at);
    if (Number.isNaN(exp.getTime())) return "Custom";
    if (exp.getTime() < Date.now()) return "Expired";
    return "Custom";
  }

  function isExpired(r: ReportRow) {
    if (!r.expires_at) return false;
    const exp = new Date(r.expires_at).getTime();
    if (!Number.isFinite(exp)) return false;
    return exp < Date.now();
  }

  async function setExpiry(reportId: string, mode: string) {
    setSavingId(reportId);
    setFlash(null);

    try {
      let expires_at: string | null = null;

      if (mode === "none") {
        expires_at = null;
      } else {
        const now = Date.now();
        const addMs =
          mode === "1h"
            ? 60 * 60 * 1000
            : mode === "1d"
              ? 24 * 60 * 60 * 1000
              : mode === "7d"
                ? 7 * 24 * 60 * 60 * 1000
                : null;

        if (addMs) expires_at = new Date(now + addMs).toISOString();
        else expires_at = null;
      }

      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expires_at }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFlash({ type: "error", text: json?.message || json?.error || "Update failed" });
        return;
      }

      // Update local list
      setRows((prev) =>
        prev.map((x) => (x.id === reportId ? { ...x, expires_at } : x))
      );

      setFlash({ type: "success", text: "Updated expiry" });
    } catch (e: any) {
      setFlash({ type: "error", text: e?.message || "Update failed" });
    } finally {
      setSavingId(null);
    }
  }

  async function revoke(reportId: string) {
    setSavingId(reportId);
    setFlash(null);

    try {
      const res = await fetch(`/api/reports/${reportId}/revoke`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFlash({ type: "error", text: json?.message || json?.error || "Revoke failed" });
        return;
      }

      setRows((prev) =>
        prev.map((x) => (x.id === reportId ? { ...x, revoked_at: new Date().toISOString() } : x))
      );

      setFlash({ type: "success", text: "Revoked" });
    } catch (e: any) {
      setFlash({ type: "error", text: e?.message || "Revoke failed" });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-2">
        <h2 className="text-lg font-semibold">Recent shares</h2>
        <div className="text-sm text-slate-600">Last links you created (copy, set expiry, revoke)</div>
      </div>

      {flash ? (
        <div
          className={`mb-3 rounded-xl border px-3 py-2 text-sm ${
            flash.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {flash.text}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="border-b py-2 pr-3">Created</th>
              <th className="border-b py-2 pr-3">Range</th>
              <th className="border-b py-2 pr-3">Token</th>
              <th className="border-b py-2 pr-3">Status</th>
              <th className="border-b py-2 pr-3">Expiry</th>
              <th className="border-b py-2 pr-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((r) => {
              const disabled = savingId === r.id;
              const status =
                r.revoked_at ? "Revoked" : isExpired(r) ? "Expired" : "Active";

              return (
                <tr key={r.id} className="text-sm">
                  <td className="border-b py-3 pr-3">{fmtDate(r.created_at)}</td>
                  <td className="border-b py-3 pr-3">{r.range || "—"}</td>
                  <td className="border-b py-3 pr-3 font-mono text-xs">{r.token}</td>

                  <td className="border-b py-3 pr-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${
                        status === "Active"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : status === "Expired"
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-red-200 bg-red-50 text-red-800"
                      }`}
                    >
                      {status}
                    </span>
                  </td>

                  <td className="border-b py-3 pr-3">
                    <div className="text-xs text-slate-600">{expiryLabel(r)}</div>
                    {r.expires_at ? (
                      <div className="text-xs text-slate-500">at {fmtDate(r.expires_at)}</div>
                    ) : null}
                  </td>

                  <td className="border-b py-3 pr-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => copyLink(r.token)}
                        disabled={disabled}
                        className="rounded-xl bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
                      >
                        Copy
                      </button>

                      <select
                        disabled={disabled || !!r.revoked_at}
                        className="rounded-xl border bg-white px-3 py-2 text-sm disabled:opacity-60"
                        defaultValue={r.expires_at ? "custom" : "none"}
                        onChange={(e) => setExpiry(r.id, e.target.value)}
                      >
                        <option value="none">No expiry</option>
                        <option value="1h">1 hour</option>
                        <option value="1d">1 day</option>
                        <option value="7d">7 days</option>
                        <option value="custom" disabled>
                          Custom
                        </option>
                      </select>

                      <button
                        onClick={() => revoke(r.id)}
                        disabled={disabled || !!r.revoked_at}
                        className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                      >
                        Revoke
                      </button>
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      {origin ? `${origin}${relUrl(r.token)}` : relUrl(r.token)}
                    </div>
                  </td>
                </tr>
              );
            })}

            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-sm text-slate-600">
                  No shares yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Note: Copy uses the full URL.
      </div>
    </div>
  );
}