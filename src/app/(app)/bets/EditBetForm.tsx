"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function EditBetForm({ bet }: { bet: any }) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [status, setStatus] = useState(bet.status);
  const [loading, setLoading] = useState(false);

  async function handleUpdate() {
    setLoading(true);

    const parsedOdds = Number(bet.odds);
    const parsedStake = Number(bet.stake);

    let newProfitLoss = 0;
    let newSettledAt = null;

    if (status === "won") {
      newProfitLoss = parsedStake * (parsedOdds - 1);
      newSettledAt = new Date().toISOString();
    } else if (status === "lost") {
      newProfitLoss = -parsedStake;
      newSettledAt = new Date().toISOString();
    }

    const oldProfitLoss = Number(bet.profit_loss || 0);

    // Net difference to apply
    const delta = newProfitLoss - oldProfitLoss;

    // Update bet first
    const { error } = await supabase
      .from("bets")
      .update({
        status,
        profit_loss: newProfitLoss,
        settled_at: newSettledAt,
      })
      .eq("id", bet.id);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // Adjust account balance only if delta != 0
    if (delta !== 0) {
      const { data: account } = await supabase
        .from("bookmaker_accounts")
        .select("current_balance")
        .eq("id", bet.bookmaker_account_id)
        .single();

      if (account) {
        await supabase
          .from("bookmaker_accounts")
          .update({
            current_balance:
              Number(account.current_balance) + delta,
          })
          .eq("id", bet.bookmaker_account_id);
      }
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="border rounded p-4 flex justify-between items-center">
      <div>
        <p className="font-medium">{bet.event_name}</p>
        <p className="text-xs text-gray-500">
          {bet.selection} @ {bet.odds}
        </p>
        <p className="text-xs mt-1">
          P/L: £{Number(bet.profit_loss).toFixed(2)}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="pending">pending</option>
          <option value="won">won</option>
          <option value="lost">lost</option>
          <option value="void">void</option>
        </select>

        <button
          onClick={handleUpdate}
          disabled={loading}
          className="bg-black text-white px-3 py-1 rounded text-sm"
        >
          {loading ? "Updating..." : "Update"}
        </button>
      </div>
    </div>
  );
}
