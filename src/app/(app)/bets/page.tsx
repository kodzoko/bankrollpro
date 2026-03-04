// src/app/bets/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import AddBetForm from "./AddBetForm";
import { settleBet } from "@/app/actions/bets";

type BetRow = {
  id: string;
  placed_at: string;
  status: "pending" | "won" | "lost" | "void";
  stake: number | null;
  profit_loss: number | null;
  odds: number | null;
  selection: string | null;
  event_name?: string | null;
  market?: string | null;
  sport?: string | null;
  created_at?: string | null;
};

function safeNumber(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function formatGBP(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

export default async function BetsPage() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user?.id) redirect("/login");

  const userId = auth.user.id;

  const { data: rowsRaw, error } = await supabase
    .from("bets")
    .select("id, placed_at, status, stake, profit_loss, odds, selection, event_name, market, sport, created_at")
    .eq("user_id", userId)
    .order("placed_at", { ascending: false })
    .limit(200);

  const rows = ((rowsRaw ?? []) as BetRow[]).sort((a, b) => {
    const ap = a.status === "pending" ? 0 : 1;
    const bp = b.status === "pending" ? 0 : 1;
    if (ap !== bp) return ap - bp;
    const at = new Date(a.placed_at).getTime();
    const bt = new Date(b.placed_at).getTime();
    return bt - at;
  });

  return (
    <main className="p-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Bets</h1>
            <div className="mt-1 text-sm text-slate-600">Add and edit your bets.</div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <AddBetForm />
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent bets</h2>
            <div className="text-sm text-slate-600">{rows.length} shown</div>
          </div>

          {error ? (
            <div className="rounded-xl border bg-red-50 p-3 text-sm text-red-700">
              Bets query error: {error.message}
            </div>
          ) : null}

          {rows.length === 0 ? (
            <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
              No bets yet. Add one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="border-b py-2 pr-3">Placed</th>
                    <th className="border-b py-2 pr-3">Status</th>
                    <th className="border-b py-2 pr-3">Stake</th>
                    <th className="border-b py-2 pr-3">P/L</th>
                    <th className="border-b py-2 pr-3">Odds</th>
                    <th className="border-b py-2 pr-3">Selection</th>
                    <th className="border-b py-2 pr-3">Settle</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="text-sm">
                      <td className="border-b py-3 pr-3">{new Date(r.placed_at).toLocaleString("en-GB")}</td>
                      <td className="border-b py-3 pr-3">{r.status}</td>
                      <td className="border-b py-3 pr-3">{formatGBP(safeNumber(r.stake))}</td>
                      <td className="border-b py-3 pr-3">{formatGBP(safeNumber(r.profit_loss))}</td>
                      <td className="border-b py-3 pr-3">{safeNumber(r.odds)}</td>
                      <td className="border-b py-3 pr-3">{r.selection ?? "—"}</td>

                      <td className="border-b py-3 pr-3">
                        {r.status === "pending" ? (
                          <form action={settleBet} className="flex items-center gap-2">
                            <input type="hidden" name="bet_id" value={r.id} />

                            <button
                              type="submit"
                              name="status"
                              value="won"
                              className="px-3 py-1 rounded-xl border hover:bg-gray-100"
                            >
                              Won
                            </button>

                            <button
                              type="submit"
                              name="status"
                              value="lost"
                              className="px-3 py-1 rounded-xl border hover:bg-gray-100"
                            >
                              Lost
                            </button>

                            <button
                              type="submit"
                              name="status"
                              value="void"
                              className="px-3 py-1 rounded-xl border hover:bg-gray-100"
                            >
                              Void
                            </button>
                          </form>
                        ) : (
                          <div className="text-sm text-slate-500">Settled</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}