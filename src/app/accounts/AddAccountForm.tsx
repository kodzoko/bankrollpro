"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AddAccountForm() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const trimmedName = name.trim();
    if (!trimmedName) return setErr("Account name is required.");

    const parsedBalance = Number(balance);
    if (Number.isNaN(parsedBalance) || parsedBalance < 0) {
      return setErr("Balance must be a valid number (0 or higher).");
    }

    setLoading(true);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      setLoading(false);
      return setErr("You must be logged in.");
    }

    const { error } = await supabase.from("bookmaker_accounts").insert({
      user_id: userData.user.id,
      name: trimmedName,
      current_balance: parsedBalance,
      currency,
      is_active: true,
    });

    setLoading(false);

    if (error) return setErr(error.message);

    setName("");
    setBalance("");
    setCurrency("GBP");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="border rounded p-4 space-y-3 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold">Add bookmaker account</h2>
        <p className="text-sm text-gray-600">
          Create an account like Bet365, Betfair, Pinnacle, etc.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2 space-y-1">
          <label className="text-sm">Name</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. Bet365"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Currency</label>
          <select
            className="w-full border rounded px-3 py-2 bg-white"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="GBP">GBP</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <div className="md:col-span-3 space-y-1">
          <label className="text-sm">Current balance</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. 500"
            inputMode="decimal"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <button
        disabled={loading}
        className="rounded bg-black text-white px-4 py-2 disabled:opacity-60"
      >
        {loading ? "Saving..." : "Add account"}
      </button>
    </form>
  );
}
