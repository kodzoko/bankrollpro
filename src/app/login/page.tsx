import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function LoginPage() {
  async function onAuth(formData: FormData): Promise<void> {
    "use server";

    const supabase = await supabaseServer();

    const intent = String(formData.get("intent") ?? "");
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email) redirect("/login?e=missing_email");

    // Reset password (send email, then go back to login)
    if (intent === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) redirect(`/login?e=${encodeURIComponent(error.message)}`);
      redirect("/login?ok=reset_sent");
    }

    // Signup (create, then go back to login)
    if (intent === "signup") {
      if (!password) redirect("/login?e=missing_password");
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) redirect(`/login?e=${encodeURIComponent(error.message)}`);
      redirect("/login?ok=signup_done");
    }

    // Sign in
    if (!password) redirect("/login?e=missing_password");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) redirect(`/login?e=${encodeURIComponent(error.message)}`);

    redirect("/dashboard/all");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
        <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-2xl font-bold">BankrollPro</div>
          <div className="mt-1 text-sm text-slate-600">
            Sign in, create an account, or reset your password.
          </div>

          {/* SIGN IN */}
          <form action={onAuth} className="mt-6 space-y-3">
            <input type="hidden" name="intent" value="signin" />

            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                name="email"
                type="email"
                placeholder="you@email.com"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <button className="w-full rounded-xl bg-black px-4 py-2 text-white">
              Sign in
            </button>
          </form>

          {/* SIGN UP + RESET */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <form action={onAuth} className="space-y-2">
              <input type="hidden" name="intent" value="signup" />
              <input
                name="email"
                type="email"
                placeholder="Email"
                className="w-full rounded-xl border px-3 py-2"
                required
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                className="w-full rounded-xl border px-3 py-2"
                required
              />
              <button className="w-full rounded-xl border px-4 py-2 hover:bg-slate-50">
                Create account
              </button>
            </form>

            <form action={onAuth} className="space-y-2">
              <input type="hidden" name="intent" value="reset" />
              <input
                name="email"
                type="email"
                placeholder="Email"
                className="w-full rounded-xl border px-3 py-2"
                required
              />
              <button className="w-full rounded-xl border px-4 py-2 hover:bg-slate-50">
                Reset password
              </button>
            </form>
          </div>

          <div className="mt-6 text-sm text-slate-600">
            Go to{" "}
            <Link className="underline" href="/dashboard/all">
              Dashboard
            </Link>{" "}
            (requires login).
          </div>
        </div>
      </div>
    </main>
  );
}