import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

type ActionState = { ok?: string; err?: string };

export default async function LoginPage() {
  async function onAuth(_: ActionState, formData: FormData): Promise<ActionState> {
    "use server";

    const supabase = await supabaseServer();

    const intent = String(formData.get("intent") ?? "");
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email) return { err: "Please enter your email." };

    // Reset password (no redirectTo needed)
    if (intent === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) return { err: error.message };
      return { ok: "Password reset email sent (if the email exists)." };
    }

    if (!password) return { err: "Please enter your password." };

    if (intent === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return { err: error.message };
      // Depending on your Supabase email-confirm setting, user may need to verify email first.
      return { ok: "Account created. You can sign in now (or verify your email if required)." };
    }

    // Sign in
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { err: error.message };

    redirect("/dashboard/all");
  }

  const initialState: ActionState = {};
  // useActionState is client-only; we keep it simple with query params? No.
  // We'll just render forms that post to server action and rely on redirects / generic success.
  // To show messages, we can use a single form with server action returning state via useActionState,
  // but that requires a client wrapper. Keeping page server-only for now.

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
        <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-2xl font-bold">BankrollPro</div>
          <div className="mt-1 text-sm text-slate-600">Sign in, create an account, or reset your password.</div>

          {/* SIGN IN */}
          <form action={onAuth.bind(null, initialState)} className="mt-6 space-y-3">
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

            <button className="w-full rounded-xl bg-black px-4 py-2 text-white">Sign in</button>
          </form>

          {/* SIGN UP + RESET */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <form action={onAuth.bind(null, initialState)} className="space-y-2">
              <input type="hidden" name="intent" value="signup" />
              <input name="email" type="email" placeholder="Email" className="w-full rounded-xl border px-3 py-2" />
              <input
                name="password"
                type="password"
                placeholder="Password"
                className="w-full rounded-xl border px-3 py-2"
              />
              <button className="w-full rounded-xl border px-4 py-2 hover:bg-slate-50">Create account</button>
            </form>

            <form action={onAuth.bind(null, initialState)} className="space-y-2">
              <input type="hidden" name="intent" value="reset" />
              <input name="email" type="email" placeholder="Email" className="w-full rounded-xl border px-3 py-2" />
              <button className="w-full rounded-xl border px-4 py-2 hover:bg-slate-50">Reset password</button>
            </form>
          </div>

          <div className="mt-6 text-sm text-slate-600">
            Go to <Link className="underline" href="/dashboard/all">Dashboard</Link> (requires login).
          </div>
        </div>
      </div>
    </main>
  );
}