// src/app/login/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

type SP = {
  error?: string;
  message?: string;
  intent?: "signin" | "signup" | "reset";
  email?: string;
};

function safeText(x?: string) {
  if (!x) return "";
  return String(x).slice(0, 500);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  async function authAction(formData: FormData) {
    "use server";

    const intent = String(formData.get("intent") || "signin") as SP["intent"];
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email) {
      redirect(`/login?intent=${intent}&error=${encodeURIComponent("Email is required.")}`);
    }

    const supabase = await supabaseServer();

    if (intent === "reset") {
      // Sends a reset email (Supabase Auth template must be configured)
      const origin = headers().get("origin") || "";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // If you later add an update-password page, you can point it here.
        // redirectTo: `${origin}/auth/callback`,
        redirectTo: origin ? `${origin}/login` : undefined,
      });

      if (error) {
        redirect(`/login?intent=reset&email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`);
      }

      redirect(
        `/login?intent=reset&email=${encodeURIComponent(email)}&message=${encodeURIComponent(
          "Password reset email sent. Please check your inbox."
        )}`
      );
    }

    if (intent === "signup") {
      if (!password || password.length < 6) {
        redirect(
          `/login?intent=signup&email=${encodeURIComponent(email)}&error=${encodeURIComponent(
            "Password must be at least 6 characters."
          )}`
        );
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        redirect(`/login?intent=signup&email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`);
      }

      // Depending on Supabase settings, user may need email confirmation.
      // If confirmation is required, Supabase won't create a session yet.
      redirect(
        `/login?intent=signin&email=${encodeURIComponent(email)}&message=${encodeURIComponent(
          "Account created. If email confirmation is enabled, please verify your email, then sign in."
        )}`
      );
    }

    // default: signin
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      redirect(`/login?intent=signin&email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`);
    }

    redirect("/dashboard/all");
  }

  const active = (sp.intent || "signin") as "signin" | "signup" | "reset";

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold">BankrollPro</div>
          <div className="mt-1 text-sm text-slate-600">Sign in or create an account</div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          {/* Tabs */}
          <div className="mb-5 grid grid-cols-3 gap-2">
            <Link
              href="/login?intent=signin"
              className={`rounded-xl border px-3 py-2 text-center text-sm ${
                active === "signin" ? "bg-black text-white" : "bg-white hover:bg-slate-50"
              }`}
            >
              Sign in
            </Link>
            <Link
              href="/login?intent=signup"
              className={`rounded-xl border px-3 py-2 text-center text-sm ${
                active === "signup" ? "bg-black text-white" : "bg-white hover:bg-slate-50"
              }`}
            >
              Create
            </Link>
            <Link
              href="/login?intent=reset"
              className={`rounded-xl border px-3 py-2 text-center text-sm ${
                active === "reset" ? "bg-black text-white" : "bg-white hover:bg-slate-50"
              }`}
            >
              Reset
            </Link>
          </div>

          {/* Alerts */}
          {sp.error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {safeText(sp.error)}
            </div>
          ) : null}

          {sp.message ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {safeText(sp.message)}
            </div>
          ) : null}

          <form action={authAction} className="space-y-4">
            <input type="hidden" name="intent" value={active} />

            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                name="email"
                type="email"
                defaultValue={sp.email || ""}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Password only for signin/signup */}
            {active !== "reset" ? (
              <div>
                <label className="text-sm font-medium">Password</label>
                <input
                  name="password"
                  type="password"
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="••••••••"
                  required
                />
                {active === "signup" ? (
                  <div className="mt-1 text-xs text-slate-500">Minimum 6 characters</div>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
            >
              {active === "signin" ? "Sign in" : active === "signup" ? "Create account" : "Send reset email"}
            </button>

            {/* Small helpers */}
            {active === "signin" ? (
              <div className="text-center text-sm text-slate-600">
                No account?{" "}
                <Link className="font-medium text-black underline" href="/login?intent=signup">
                  Create one
                </Link>
              </div>
            ) : null}

            {active === "signup" ? (
              <div className="text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link className="font-medium text-black underline" href="/login?intent=signin">
                  Sign in
                </Link>
              </div>
            ) : null}

            {active === "reset" ? (
              <div className="text-center text-sm text-slate-600">
                Remembered your password?{" "}
                <Link className="font-medium text-black underline" href="/login?intent=signin">
                  Sign in
                </Link>
              </div>
            ) : null}
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          By continuing, you agree to use this MVP responsibly.
        </div>
      </div>
    </main>
  );
}