import Link from "next/link";

type Range = "all" | "7d" | "30d";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function RangeTabs({ currentRange }: { currentRange: Range }) {
  const base = "rounded-xl border px-3 py-2 text-sm transition-colors";
  const active = "bg-slate-900 text-white border-slate-900";
  const idle = "bg-white text-slate-700 hover:bg-slate-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/dashboard/all"
        className={cx(base, currentRange === "all" ? active : idle)}
      >
        All Time
      </Link>

      <Link
        href="/dashboard/7"
        className={cx(base, currentRange === "7d" ? active : idle)}
      >
        Last 7 Days
      </Link>

      <Link
        href="/dashboard/30"
        className={cx(base, currentRange === "30d" ? active : idle)}
      >
        Last 30 Days
      </Link>
    </div>
  );
}