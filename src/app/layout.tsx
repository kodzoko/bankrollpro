import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import ToastProvider from "@/components/ToastProvider";
import LogoutButton from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "BankrollPro",
  description: "Smart bankroll management",
};

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
    >
      {label}
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <ToastProvider>
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="hidden w-64 shrink-0 border-r bg-white p-5 md:block">
              <div className="text-xl font-extrabold">BankrollPro</div>
              <div className="mt-1 text-xs text-slate-500">Smart bankroll management</div>

              <nav className="mt-6 flex flex-col gap-1">
                <NavLink href="/dashboard/all" label="Dashboard" />
                <NavLink href="/accounts" label="Accounts" />
                <NavLink href="/bets" label="Bets" />
                <NavLink href="/settings" label="Settings" />
              </nav>

              {/* Logout */}
              <div className="mt-8 border-t pt-4">
                <LogoutButton />
              </div>
            </aside>

            {/* Main */}
            <div className="min-w-0 flex-1">
              <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">{children}</div>
            </div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}