import Link from "next/link";
import { isProFromRequestCookies } from "@/lib/proCookie";

export default async function ProGate({
  children,
  title = "Pro feature",
  description = "This feature is available on Pro.",
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  const isPro = await isProFromRequestCookies();

  if (isPro) return <>{children}</>;

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{description}</div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href="/upgrade"
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Upgrade to Pro
        </Link>
        <span className="text-xs text-slate-500">£9/month</span>
      </div>
    </div>
  );
}