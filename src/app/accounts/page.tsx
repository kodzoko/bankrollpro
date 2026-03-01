import { redirect } from "next/navigation";

import AddAccountForm from "./AddAccountForm";
import AccountsList from "./AccountsList";
import { supabaseServer } from "@/lib/supabase/server";

function safeNumber(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || "GBP"} ${amount.toFixed(2)}`;
  }
}

export default async function AccountsPage() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: accountsRaw, error } = await supabase
    .from("bookmaker_accounts")
    .select("id, name, currency, current_balance, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const accounts = (accountsRaw ?? []) as Array<{
    id: string;
    name: string;
    currency: string;
    current_balance: number;
  }>;

  const totalBankroll = accounts.reduce((acc, a) => acc + safeNumber(a.current_balance), 0);
  const currency = accounts[0]?.currency || "GBP";

  return (
    <main className="p-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Accounts</h1>
            <div className="mt-1 text-sm text-slate-600">Manage your bookmaker accounts and balances.</div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">Total Bankroll</div>
            <div className="text-lg font-bold">{formatMoney(totalBankroll, currency)}</div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <AddAccountForm />
        </div>

        <div className="mt-6">
          <AccountsList initial={accounts} />
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border bg-red-50 p-3 text-sm text-red-700">
            Accounts query error: {error.message}
          </div>
        ) : null}
      </div>
    </main>
  );
}