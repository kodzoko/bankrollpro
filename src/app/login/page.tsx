import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="p-6">
          <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-600">Loading…</div>
          </div>
        </main>
      }
    >
      <LoginClient />
    </Suspense>
  );
}