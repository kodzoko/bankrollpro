"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Props = {
  className?: string;
};

function tabClass(active: boolean) {
  const base =
    "rounded-xl border px-3 py-2 text-sm transition-colors";
  const inactive = "bg-white hover:bg-slate-50 text-slate-900";
  const activeCls = "bg-black text-white border-black";
  return `${base} ${active ? activeCls : inactive}`;
}

export default function RangeTabs({ className }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filters URL'de kalmaya devam etsin diye query'yi aynen taşıyoruz
  const qs = searchParams?.toString();
  const suffix = qs ? `?${qs}` : "";

  const isAll = pathname === "/dashboard" || pathname === "/dashboard/all";
  const is7d = pathname === "/dashboard/7d";
  const is30d = pathname === "/dashboard/30d";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <Link className={tabClass(isAll)} href={`/dashboard/all${suffix}`}>
        All Time
      </Link>
      <Link className={tabClass(is7d)} href={`/dashboard/7d${suffix}`}>
        Last 7 Days
      </Link>
      <Link className={tabClass(is30d)} href={`/dashboard/30d${suffix}`}>
        Last 30 Days
      </Link>
    </div>
  );
}