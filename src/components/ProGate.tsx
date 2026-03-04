// src/components/ProGate.tsx
import Link from "next/link";
import { isProFromCookies } from "@/lib/proCookie";

export default async function ProGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const isPro = await isProFromCookies();

  if (isPro) return <>{children}</>;

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold">Pro feature</div>
      <div className="mt-1 text-sm text-slate-600">
        This feature is available on Pro.
      </div>

      <Link
        href="/upgrade"
        className="mt-4 inline-flex rounded-xl bg-black px-4 py-2 text-sm text-white"
      >
        Upgrade
      </Link>
    </div>
  );
}