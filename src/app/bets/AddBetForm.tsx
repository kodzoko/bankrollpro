"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { calculateKelly } from "@/lib/kelly/calculateKelly";

type UserSettings = {
  fractional_kelly: number;
  max_stake_percent: number;
};

export default function AddBetForm() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState("");
  const [bankroll, setBankroll] = useState(0);

  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [eventName, setEventName] = useState("");
  const [selection, setSelection] = useState("");
  const [odds, setOdds] = useState("");
  const [probability, setProbability] = useState(""); // %
  const [stake, setStake] = useState("");
  const [status, setStatus] = useState("pending");

  // Load accounts + settings once
  useEffect(() => {
    async function loadData() {
      const { data: accs } = await supabase
        .from("bookmaker_accounts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const { data: s } = await supabase
        .from("user_settings")
        .select("fractional_kelly,max_stake_percent")
        .single();

      setAccounts(accs || []);
      setSettings(
        s
          ? {
              fractional_kelly: Number(s.fractional_kelly),
              max_stake_percent: Number(s.max_stake_percent),
            }
          : null
      );

      if (accs?.length) {
        setAccountId(accs[0].id);
        setBankroll(Number(accs[0].current_balance));
      }
    }

    loadData();
  }, []);

  // When account changes, update bankroll from selected account
  useEffect(() => {
    if (!accountId) return;
    const acc = accounts.find((a) => a.id === accountId);
    if (acc) setBankroll(Number(acc.current_balance));
  }, [accountId, accounts]);

  const kelly = useMemo(() => {
    if (!settings) return null;

    const o = Number(odds);
    const pPct = Number(probability);

    if (!Number.isFinite(o) || o <= 1) return null;
    if (!Number.isFinite(pPct) || pPct <= 0 || pPct >= 100) return null;
    if (!Number.isFinite(bankroll) || bankroll <= 0) return null;

    return calculateKelly(
      bankroll,
      o,
      pPct / 100,
      settings.fractional_kelly,
      settings.max_stake_percent
    );
  }, [settings, odds, probability, bankroll]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsedOdds = Number(odds);
    const parsedStake = Number(stake);

    if (!accountId || !eventName.trim() || !selection.trim()) return;
    if (!Number.isFinite(parsedOdds) || parsedOdds <= 1) return;
    if (!Number.isFinite(parsedStake) || parsedStake <= 0) return;

    let profitLoss = 0;
    let settledAt: string | null = null;

    if (status === "won") {
      profitLoss = parsedStake * (parsedOdds - 1);
      settledAt = new Date().toISOString();
    } else if (status === "lost") {
      profitLoss = -parsedStake;
      settledAt = new Date().toISOString();
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { error } = await supabase.from("bets").insert({
      user_id: userData.user.id,
      bookmaker_account_id: accountId,
      placed_at: new Date().toISOString(),
      sport: "Football",
      event_name: eventName.trim(),
      market: "Match Odds",
      selection: selection.trim(),
      odds: parsedOdds,
      stake: parsedStake,
      status,
      profit_loss: profitLoss,
      settled_at: settledAt,
    });

    if (error) {
      alert(error.message);
      return;
    }

    // Only adjust balance if bet is already settled
    if (settledAt) {
      const { data: account } = await supabase
        .from("bookmaker_accounts")
        .select("current_balance")
        .eq("id", accountId)
        .single();

      if (account) {
        await supabase
          .from("bookmaker_accounts")
          .update({
            current_balance: Number(account.current_balance) + profitLoss,
          })
          .eq("id", accountId);
      }
    }

    router.refresh();
  }

  const showKelly = !!kelly;
  const positiveEdge = kelly ? kelly.edge > 0 && kelly.fraction > 0 : false;

  return (
    <form onSubmit={handleSubmit} className="border rounded p-4 space-y-3">
      <h2 className="text-lg font-semibold">Add Bet</h2>

      <select
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className="border rounded px-3 py-2 w-full bg-white"
      >
        {accounts.map((acc) => (
          <option key={acc.id} value={acc.id}>
            {acc.name} (Bankroll: {acc.currency} {Number(acc.current_balance).toFixed(2)})
          </option>
        ))}
      </select>

      <input
        placeholder="Event name"
        value={eventName}
        onChange={(e) => setEventName(e.target.value)}
        className="border rounded px-3 py-2 w-full"
      />

      <input
        placeholder="Selection"
        value={selection}
        onChange={(e) => setSelection(e.target.value)}
        className="border rounded px-3 py-2 w-full"
      />

      <input
        placeholder="Odds (decimal)"
        value={odds}
        onChange={(e) => setOdds(e.target.value)}
        className="border rounded px-3 py-2 w-full"
      />

      <input
        placeholder="Win Probability (%)"
        value={probability}
        onChange={(e) => setProbability(e.target.value)}
        className="border rounded px-3 py-2 w-full"
      />

      {showKelly && (
        <div className="bg-gray-50 border rounded p-3 text-sm space-y-1">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span>
              <strong>Edge (EV):</strong>{" "}
              {(kelly!.edge * 100).toFixed(2)}%
            </span>
            <span>
              <strong>Kelly (raw):</strong>{" "}
              {(kelly!.rawKelly * 100).toFixed(2)}%
            </span>
            <span>
              <strong>Kelly (fractional):</strong>{" "}
              {(kelly!.fraction * 100).toFixed(2)}%
            </span>
          </div>

          {!positiveEdge ? (
            <div className="text-red-600">
              No positive edge at these inputs. Kelly recommends £0.00.
            </div>
          ) : (
            <div>
              <strong>Recommended Stake:</strong>{" "}
              £{kelly!.recommendedStake.toFixed(2)}
              {kelly!.capped && (
                <span className="text-gray-600">
                  {" "}
                  (capped from £{kelly!.uncappedStake.toFixed(2)})
                </span>
              )}
              <button
                type="button"
                onClick={() => setStake(kelly!.recommendedStake.toFixed(2))}
                className="ml-3 underline"
              >
                Use Kelly
              </button>
            </div>
          )}
        </div>
      )}

      <input
        placeholder="Stake"
        value={stake}
        onChange={(e) => setStake(e.target.value)}
        className="border rounded px-3 py-2 w-full"
      />

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="border rounded px-3 py-2 w-full bg-white"
      >
        <option value="pending">pending</option>
        <option value="won">won</option>
        <option value="lost">lost</option>
        <option value="void">void</option>
      </select>

      <button className="bg-black text-white px-4 py-2 rounded">
        Add Bet
      </button>
    </form>
  );
}
