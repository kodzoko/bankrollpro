import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

const CURRENCIES = ["GBP", "EUR", "USD", "NGN", "TRY"] as const;

function toNumber(v: FormDataEntryValue | null) {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : NaN;
}

export default async function BankrollSettingsPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  async function saveBankroll(formData: FormData) {
    "use server";

    const supabase = await supabaseServer();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) redirect("/login");

    const starting_bankroll = toNumber(formData.get("starting_bankroll"));
    const currencyRaw = String(formData.get("currency") ?? "GBP");
    const currency = (CURRENCIES as readonly string[]).includes(currencyRaw) ? currencyRaw : "GBP";

    if (!Number.isFinite(starting_bankroll) || starting_bankroll <= 0) {
      throw new Error("Starting bankroll must be a positive number.");
    }

    // Upsert into bankroll_settings (this table is currently empty)
    const { error: upsertError } = await supabase
      .from("bankroll_settings")
      .upsert(
        {
          user_id: user.id,
          starting_bankroll,
          currency,
        },
        { onConflict: "user_id" }
      );

    if (upsertError) throw new Error(upsertError.message);

    redirect("/dashboard/all");
  }

  // Load existing settings (if any)
  const { data: settings } = await supabase
    .from("bankroll_settings")
    .select("starting_bankroll,currency")
    .eq("user_id", user.id)
    .maybeSingle();

  const defaultCurrency = (settings?.currency as string) || "GBP";
  const defaultStarting = settings?.starting_bankroll ?? "";

  return (
    <main className="p-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold">Starting bankroll</h1>
          <p className="mt-2 text-sm text-slate-600">
            BankrollPro uses this as the baseline for risk, exposure, and drawdown.
          </p>

          <form action={saveBankroll} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Amount</label>
              <input
                name="starting_bankroll"
                defaultValue={defaultStarting}
                placeholder="e.g. 500"
                inputMode="decimal"
                className="mt-1 w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Currency</label>
              <select
                name="currency"
                defaultValue={defaultCurrency}
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="rounded-xl bg-black px-4 py-2 text-white">
              Save
            </button>

            <div className="text-xs text-slate-500">
              Notes: MVP uses <strong>starting bankroll + settled P/L</strong>. Deposits/withdrawals come later.
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}