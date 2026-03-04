// src/app/layout.tsx
import type { ReactNode } from "react";

export const metadata = {
  title: "BankrollPro",
  description: "Smart bankroll management",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}