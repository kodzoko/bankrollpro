import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

const CURRENCIES = ["GBP", "EUR", "USD", "NGN", "TRY"] as const;

function absoluteUrl(path: string) {
  // Local dev + production uyumlu
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL?.startsWith("http")
      ? process.env.NEXT_PUBLIC_VERCEL_URL
      : process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000";

  return `${base}${path}`;
}

function randomToken() {
  // kısa ve paylaşılabilir token
  return crypto.randomUUID().replaceAll("-", "").slice(0, 10);
}

export default async function SettingsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  async function saveSettings(formData: FormData) {
    "use server";

    const supabase = await supabaseServer();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) redirect("/login");

    const fractional_kelly = Number(formData.get("fractional_kelly") ?? "");
    const max_stake_percent = Number(formData.get("max_stake_percent") ?? "");

    const starting_bankroll = Number(formData.get("starting_bankroll") ?? "");
    const currency = String(formData.get("currency") ?? "GBP");

    // user_settings upsert
    if (Number.isFinite(fractional_kelly) && Number.isFinite(max_stake_percent)) {
      const { error } = await supabase.from("user_settings").upsert(
        {
          user_id: user.id,
          fractional_kelly,
          max_stake_percent,
        },
        { onConflict: "user_id" }
      );
      if (error) throw new Error(error.message);
    }

    // bankroll_settings upsert
    if (Number.isFinite(starting_bankroll) && starting_bankroll >= 0) {
      const { error } = await supabase.from("bankroll_settings").upsert(
        {
          user_id: user.id,
          starting_bankroll,
          currency,
          start_date: new Date().toISOString().slice(0, 10),
        },
        { onConflict: "user_id" }
      );
      if (error) throw new Error(error.message);
    }

    redirect("/dashboard/all");
  }

  async function generateShareLink() {
    "use server";

    const supabase = await supabaseServer();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) redirect("/login");

    // aktif link varsa onu koru (tek link yeter)
    const { data: existing } = await supabase
      .from("share_links")
      .select("id, token, revoked_at")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .maybeSingle();

    if (existing?.token) {
      redirect("/settings");
    }

    const token = randomToken();

    const { error } = await supabase.from("share_links").insert({
      user_id: user.id,
      token,
    });

    if (error) throw new Error(error.message);

    redirect("/settings");
  }

  async function revokeShareLink() {
    "use server";

    const supabase = await supabaseServer();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) redirect("/login");

    const { data: existing, error: selErr } = await supabase
      .from("share_links")
      .select("id")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .maybeSingle();

    if (selErr) throw new Error(selErr.message);

    if (existing?.id) {
      const { error } = await supabase
        .from("share_links")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("user_id", user.id);

      if (error) throw new Error(error.message);
    }

    redirect("/settings");
  }

  // Load current settings
  const [{ data: userSettings }, { data: bankrollSettings }, { data: shareLink }] =
    await Promise.all([
      supabase.from("user_settings").select("fractional_kelly,max_stake_percent").eq("user_id", user.id).maybeSingle(),
      supabase.from("bankroll_settings").select("starting_bankroll,currency").eq("user_id", user.id).maybeSingle(),
      supabase.from("share_links").select("token,revoked_at").eq("user_id", user.id).is("revoked_at", null).maybeSingle(),
    ]);

  const fractional = Number(userSettings?.fractional_kelly ?? 0.5);
  const maxStake = Number(userSettings?.max_stake_percent ?? 0.05);

  const starting = Number(bankrollSettings?.starting_bankroll ?? 0);
  const currency = String(bankrollSettings?.currency ?? "GBP");

  const publicUrl = shareLink?.token ? absoluteUrl(`/r/${shareLink.token}`) : null;

  return (
    <main className="p-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <div className="mt-1 text-sm text-slate-600">Account & app preferences.</div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold">Pro access (Beta)</div>
            <div className="mt-1 text-sm text-slate-600">
              Temporary toggle while Stripe verification is wired.
            </div>
            <div className="mt-4 rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">
              Coming soon.
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold">Fractional Kelly</div>
            <div className="mt-1 text-sm text-slate-600">
              Controls recommended stake sizing in Bets.
            </div>

            <form action={saveSettings} className="mt-4 space-y-3">
              <div>
                <div className="text-sm font-medium">Fractional Kelly (0.25 / 0.5 / 1)</div>
                <input
                  name="fractional_kelly"
                  defaultValue={String(fractional)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>

              <div>
                <div className="text-sm font-medium">Max Stake % of Bankroll (0.05 = 5%)</div>
                <input
                  name="max_stake_percent"
                  defaultValue={String(maxStake)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>

              {/* bankroll fields also saved from same form */}
              <input type="hidden" name="starting_bankroll" defaultValue={String(starting)} />
              <input type="hidden" name="currency" defaultValue={currency} />

              <button className="rounded-xl bg-black px-4 py-2 text-sm text-white">
                Save Settings
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-lg font-semibold">Starting bankroll</div>
          <div className="mt-1 text-sm text-slate-600">
            Used as the baseline for risk, exposure, and drawdown in the Dashboard.
          </div>

          <form action={saveSettings} className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium">Amount</div>
                <input
                  name="starting_bankroll"
                  defaultValue={String(starting)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </div>

              <div>
                <div className="text-sm font-medium">Currency</div>
                <select
                  name="currency"
                  defaultValue={currency}
                  className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* kelly fields also saved from same form */}
            <input type="hidden" name="fractional_kelly" defaultValue={String(fractional)} />
            <input type="hidden" name="max_stake_percent" defaultValue={String(maxStake)} />

            <button className="mt-4 rounded-xl bg-black px-4 py-2 text-sm text-white">
              Save bankroll
            </button>

            <div className="mt-3 text-sm text-slate-600">
              MVP: bankroll now = starting bankroll + settled P/L. Deposits/withdrawals come later.
            </div>
          </form>
        </div>

        {/* Share link (critical feature) */}
        <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-lg font-semibold">Shareable performance link</div>
          <div className="mt-1 text-sm text-slate-600">
            Create a public, read-only report link (no bet details shared).
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {publicUrl ? (
              <>
                <div className="rounded-xl border bg-slate-50 p-3 text-sm">
                  <div className="font-medium">Your public link</div>
                  <div className="mt-1 break-all text-slate-700">{publicUrl}</div>
                  <div className="mt-2 text-xs text-slate-600">
                    Tip: open it in an incognito window to test.
                  </div>
                </div>

                <div className="flex gap-2">
                  <form action={revokeShareLink}>
                    <button className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50">
                      Revoke link
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <form action={generateShareLink}>
                <button className="rounded-xl bg-black px-4 py-2 text-sm text-white">
                  Generate public link
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}