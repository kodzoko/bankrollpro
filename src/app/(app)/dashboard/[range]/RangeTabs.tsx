"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard/all") {
    return pathname === "/dashboard" || pathname === "/dashboard/all" || pathname.startsWith("/dashboard/all?");
  }
  return pathname === href || pathname.startsWith(`${href}?`);
}

export default function RangeTabs() {
  const pathname = usePathname();

  const tabBase = "rounded-xl border px-3 py-2 text-sm transition-colors";
  const tabActive = "bg-slate-900 text-white border-slate-900";
  const tabIdle = "bg-white text-slate-700 hover:bg-slate-50";

  return (
    <>
      <Link
        href="/dashboard/all"
        className={cx(tabBase, isActive(pathname, "/dashboard/all") ? tabActive : tabIdle)}
      >
        All Time
      </Link>

      <Link
        href="/dashboard/7"
        className={cx(tabBase, isActive(pathname, "/dashboard/7") ? tabActive : tabIdle)}
      >
        Last 7 Days
      </Link>

      <Link
        href="/dashboard/30"
        className={cx(tabBase, isActive(pathname, "/dashboard/30") ? tabActive : tabIdle)}
      >
        Last 30 Days
      </Link>
    </>
  );
}