// src/app/(app)/layout.tsx
import type { ReactNode } from "react";
import Link from "next/link";

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
    >
      {label}
    </Link>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="hidden w-64 shrink-0 border-r bg-white p-6 md:block">
            <div className="text-lg font-bold">BankrollPro</div>
            <div className="mt-1 text-xs text-slate-500">Smart bankroll management</div>

            <nav className="mt-6 space-y-1">
              <NavItem href="/dashboard/all" label="Dashboard" />
              <NavItem href="/accounts" label="Accounts" />
              <NavItem href="/bets" label="Bets" />
              <NavItem href="/settings" label="Settings" />
            </nav>
          </aside>

          {/* Main */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Top bar */}
            <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="font-semibold">BankrollPro</div>
                <nav className="flex items-center gap-1 md:hidden">
                  <NavItem href="/dashboard/all" label="Dashboard" />
                  <NavItem href="/bets" label="Bets" />
                  <NavItem href="/accounts" label="Accounts" />
                  <NavItem href="/settings" label="Settings" />
                </nav>
              </div>
            </header>

            {/* Page content */}
            <main className="p-6">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
