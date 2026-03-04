"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ShareReportButton({ range, isPro }: { range: string; isPro: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function onClick() {
    setMsg("");

    if (!isPro) {
      router.push("/upgrade");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ range }),
      });

      if (!res.ok) {
        const t = await res.text();
        setMsg(t || "Share failed");
        return;
      }

      const json = (await res.json()) as { token?: string };
      const token = json?.token;
      if (!token) {
        setMsg("Share failed (missing token)");
        return;
      }

      const full = `${window.location.origin}/report/${token}`;
      await navigator.clipboard.writeText(full);

      setMsg("Copied link ✅");
      router.refresh();
    } catch {
      setMsg("Copy failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
        title={!isPro ? "Pro required" : "Create a shareable report link"}
      >
        {loading ? "Sharing..." : "Share"}
      </button>

      {msg ? <span className="text-xs text-slate-600">{msg}</span> : null}
    </div>
  );
}