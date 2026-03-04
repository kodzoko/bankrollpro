"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SettingsForm({ initialSettings }: any) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [fractional, setFractional] = useState(
    initialSettings?.fractional_kelly ?? 0.5
  );

  const [maxPercent, setMaxPercent] = useState(
    initialSettings?.max_stake_percent ?? 0.05
  );

  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const userId = userData.user.id;

    const { error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: userId,
          fractional_kelly: Number(fractional),
          max_stake_percent: Number(maxPercent),
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      alert(error.message);
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="border rounded p-6 space-y-4 max-w-md">
      <div>
        <label className="text-sm font-medium">
          Fractional Kelly (0.25 / 0.5 / 1)
        </label>
        <input
          type="number"
          step="0.01"
          value={fractional}
          onChange={(e) => setFractional(e.target.value)}
          className="border rounded px-3 py-2 w-full mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium">
          Max Stake % of Bankroll (0.05 = 5%)
        </label>
        <input
          type="number"
          step="0.01"
          value={maxPercent}
          onChange={(e) => setMaxPercent(e.target.value)}
          className="border rounded px-3 py-2 w-full mt-1"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded"
      >
        {loading ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
