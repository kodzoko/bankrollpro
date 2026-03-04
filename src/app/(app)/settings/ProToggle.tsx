"use client";

import { useEffect, useState } from "react";

export default function ProToggle() {
  const [isPro, setIsPro] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const v = document.cookie.split("; ").find((x) => x.startsWith("bp_pro="))?.split("=")[1];
    setIsPro(v === "1");
  }, []);

  async function toggle() {
    setBusy(true);
    const next = !isPro;

    await fetch("/api/pro", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });

    setIsPro(next);
    setBusy(false);
    // cookie set edildi, UI yenilensin
    window.location.reload();
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">Pro access (Beta)</div>
          <div className="mt-1 text-xs text-slate-500">Temporary toggle while Stripe verification is wired.</div>
        </div>

        <button
          onClick={toggle}
          disabled={busy}
          className={`rounded-xl border px-3 py-2 text-sm ${
            isPro ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200"
          } ${busy ? "opacity-60" : ""}`}
        >
          {isPro ? "Pro: ON" : "Pro: OFF"}
        </button>
      </div>
    </div>
  );
}