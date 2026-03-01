"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const sp = useSearchParams();

  // optional redirect: /login?next=/dashboard/all
  const nextUrl = sp.get("next") || "/dashboard/all";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const e2 = email.trim();
    if (!e2) return setErr("Email is required.");
    if (!password) return setErr("Password is required.");

    setSaving(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: e2,
        password,
      });

      if (error) {
        setErr(error.message);
        return;
      }

      router.replace(nextUrl);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Login failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Login</h1>
        <div className="mt-1 text-sm text-slate-600">
          Sign in to continue.
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm">Email</label>
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm">Password</label>
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          {err ? <div className="text-sm text-red-600">{err}</div> : null}

          <button
            disabled={saving}
            className="w-full rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-sm text-slate-600">
          Don’t have an account?{" "}
          <Link className="font-semibold underline" href="/signup">
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}