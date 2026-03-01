"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Range = "all" | "7d" | "30d";

type Props = {
  currentRange?: Range;
};

export default function BetsFilters({ currentRange = "all" }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const initial = useMemo(() => {
    return {
      status: (sp.get("status") || "all") as string,
      minStake: sp.get("minStake") || "",
      from: sp.get("from") || "",
      to: sp.get("to") || "",
    };
  }, [sp]);

  const [status, setStatus] = useState(initial.status);
  const [minStake, setMinStake] = useState(initial.minStake);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  function buildUrl(clear = false) {
    const basePath =
      pathname?.startsWith("/dashboard/") ? pathname : `/dashboard/${currentRange}`;

    const params = new URLSearchParams(clear ? {} : sp.toString());

    if (clear) {
      // nothing
    } else {
      params.set("status", status || "all");

      if (minStake) params.set("minStake", minStake);
      else params.delete("minStake");

      if (from) params.set("from", from);
      else params.delete("from");

      if (to) params.set("to", to);
      else params.delete("to");
    }

    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  function onApply() {
    router.push(buildUrl(false));
  }

  function onClear() {
    setStatus("all");
    setMinStake("");
    setFrom("");
    setTo("");
    router.push(buildUrl(true));
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-600">Status</label>
          <select
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="won">won</option>
            <option value="lost">lost</option>
            <option value="void">void</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-600">Min Stake</label>
          <input
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            placeholder="e.g. 5"
            value={minStake}
            onChange={(e) => setMinStake(e.target.value)}
            inputMode="decimal"
          />
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-600">From (YYYY-MM-DD)</label>
          <input
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            placeholder="YYYY-MM-DD"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-600">To (YYYY-MM-DD)</label>
          <input
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            placeholder="YYYY-MM-DD"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className="md:col-span-12 flex gap-2">
          <button
            onClick={onApply}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            Apply
          </button>
          <button
            onClick={onClear}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
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