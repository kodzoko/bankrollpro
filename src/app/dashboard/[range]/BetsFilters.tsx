"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  currentRange: string; // "all" | "7d" | "30d"
};

function normaliseRange(r: string) {
  const x = (r || "all").toLowerCase();
  if (x === "7d" || x === "30d" || x === "all") return x;
  return "all";
}

export default function BetsFilters({ currentRange }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const range = normaliseRange(currentRange);

  // Read initial values from URL
  const initial = useMemo(() => {
    return {
      status: (sp.get("status") || "all").toLowerCase(),
      minStake: sp.get("minStake") || "",
      from: sp.get("from") || "",
      to: sp.get("to") || "",
    };
  }, [sp]);

  const [status, setStatus] = useState(initial.status);
  const [minStake, setMinStake] = useState(initial.minStake);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  function basePath() {
    // Safety: always navigate to /dashboard/<range>
    return `/dashboard/${range}`;
  }

  function apply() {
    const params = new URLSearchParams();

    if (status && status !== "all") params.set("status", status);
    if (minStake.trim()) params.set("minStake", minStake.trim());
    if (from.trim()) params.set("from", from.trim());
    if (to.trim()) params.set("to", to.trim());

    const qs = params.toString();
    router.push(qs ? `${basePath()}?${qs}` : basePath());
  }

  function clear() {
    setStatus("all");
    setMinStake("");
    setFrom("");
    setTo("");
    router.push(basePath());
  }

  return (
    <div className="mt-3">
      <div className="grid gap-3 md:grid-cols-12">
        {/* Status */}
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-500">Status</label>
          <select
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="void">Void</option>
          </select>
        </div>

        {/* Min Stake */}
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-500">Min Stake</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="e.g. 5"
            inputMode="decimal"
            value={minStake}
            onChange={(e) => setMinStake(e.target.value)}
          />
        </div>

        {/* From */}
        <div className="md:col-span-3">
          <label className="block text-xs text-slate-500">From (YYYY-MM-DD)</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="YYYY-MM-DD"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        {/* To */}
        <div className="md:col-span-3">
          <label className="block text-xs text-slate-500">To (YYYY-MM-DD)</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="YYYY-MM-DD"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="md:col-span-2 flex items-end gap-2">
          <button
            onClick={apply}
            className="w-full rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Apply
          </button>
          <button
            onClick={clear}
            className="w-full rounded-xl border bg-slate-100 px-4 py-2 text-sm hover:bg-slate-200"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Tip: Filters are stored in the URL, so you can share the exact view.
      </div>
    </div>
  );
}