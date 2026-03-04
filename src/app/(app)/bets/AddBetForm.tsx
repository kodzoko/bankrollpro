"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateKelly } from "@/lib/kelly/calculateKelly";
import { addBet } from "@/app/actions/bets";

type UserSettings = {
  fractional_kelly: number;
  max_stake_percent: number;
};

export default function AddBetForm() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState("");
  const [bankroll, setBankroll] = useState(0);

  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [eventName, setEventName] = useState("");
  const [selection, setSelection] = useState("");
  const [odds, setOdds] = useState("");
  const [probability, setProbability] = useState(""); // % (MVP: only for Kelly hint)
  const [stake, setStake] = useState("");

  // Load accounts + settings (client read is fine)
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser");
      const supabase = createSupabaseBrowserClient();

      const { data: accs } = await supabase
        .from("bookmaker_accounts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const { data: s } = await supabase
        .from("user_settings")
        .select("fractional_kelly,max_stake_percent")
        .single();

      if (!mounted) return;

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
    return () => {
      mounted = false;
    };
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

  const showKelly = !!kelly;
  const positiveEdge = kelly ? kelly.edge > 0 && kelly.fraction > 0 : false;

  return (
    <form action={addBet} className="border rounded p-4 space-y-3">
      <h2 className="text-lg font-semibold">Add Bet</h2>

      {/* Bookmaker account */}
      <select
        name="bookmaker_account_id"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className="border rounded px-3 py-2 w-full bg-white"
        required
      >
        {accounts.map((acc) => (
          <option key={acc.id} value={acc.id}>
            {acc.name} (Bankroll: {acc.currency} {Number(acc.current_balance).toFixed(2)})
          </option>
        ))}
      </select>

      {/* Optional meta (kept minimal) */}
      <input
        name="event_name"
        placeholder="Event name"
        value={eventName}
        onChange={(e) => setEventName(e.target.value)}
        className="border rounded px-3 py-2 w-full"
        required
      />

      <input
        name="selection"
        placeholder="Selection"
        value={selection}
        onChange={(e) => setSelection(e.target.value)}
        className="border rounded px-3 py-2 w-full"
        required
      />

      <input
        name="odds"
        placeholder="Odds (decimal)"
        value={odds}
        onChange={(e) => setOdds(e.target.value)}
        className="border rounded px-3 py-2 w-full"
        inputMode="decimal"
        required
      />

      <input
        name="win_probability"
        placeholder="Win Probability (%) (optional)"
        value={probability}
        onChange={(e) => setProbability(e.target.value)}
        className="border rounded px-3 py-2 w-full"
        inputMode="decimal"
      />

      {showKelly && (
        <div className="bg-gray-50 border rounded p-3 text-sm space-y-1">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span>
              <strong>Edge (EV):</strong> {(kelly!.edge * 100).toFixed(2)}%
            </span>
            <span>
              <strong>Kelly (raw):</strong> {(kelly!.rawKelly * 100).toFixed(2)}%
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
              <strong>Recommended Stake:</strong> £{kelly!.recommendedStake.toFixed(2)}
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
        name="stake"
        placeholder="Stake"
        value={stake}
        onChange={(e) => setStake(e.target.value)}
        className="border rounded px-3 py-2 w-full"
        inputMode="decimal"
        required
      />

      {/* Status REMOVED: always pending */}

      <button type="submit" className="bg-black text-white px-4 py-2 rounded">
        Add Bet
      </button>

      <div className="text-xs text-slate-500">
        New bets are saved as <strong>pending</strong>. Settle them below (Won/Lost/Void).
      </div>
    </form>
  );
}