import { redirect } from "next/navigation";

import AddBetForm from "./AddBetForm";
import EditBetForm from "./EditBetForm";
import { supabaseServer } from "@/lib/supabase/server";

function safeNumber(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function formatGBP(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

export default async function BetsPage() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  const userId = auth.user?.id;
  if (!userId) redirect("/login");

  const { data: rowsRaw, error } = await supabase
    .from("bets")
    .select("id, placed_at, status, stake, profit_loss, odds, selection, created_at")
    .eq("user_id", userId)
    .order("placed_at", { ascending: false })
    .limit(200);

  const rows = (rowsRaw ?? []) as any[];

  return (
    <main className="p-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Bets</h1>
          <div className="mt-1 text-sm text-slate-600">Add and manage your bets.</div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <AddBetForm />
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Bets</h2>
            <div className="text-sm text-slate-600">Up to 200 rows</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="border-b py-2 pr-3">Created</th>
                  <th className="border-b py-2 pr-3">Status</th>
                  <th className="border-b py-2 pr-3">Stake</th>
                  <th className="border-b py-2 pr-3">Profit</th>
                  <th className="border-b py-2 pr-3">Odds</th>
                  <th className="border-b py-2 pr-3">Selection</th>
                  <th className="border-b py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="text-sm">
                    <td className="border-b py-3 pr-3">
                      {r.placed_at ? new Date(r.placed_at).toLocaleString("en-GB") : "—"}
                    </td>
                    <td className="border-b py-3 pr-3">{r.status ?? "—"}</td>
                    <td className="border-b py-3 pr-3">{formatGBP(safeNumber(r.stake))}</td>
                    <td className="border-b py-3 pr-3">{formatGBP(safeNumber(r.profit_loss))}</td>
                    <td className="border-b py-3 pr-3">{safeNumber(r.odds)}</td>
                    <td className="border-b py-3 pr-3">{r.selection ?? "—"}</td>
                    <td className="border-b py-3 pr-3">
                      <EditBetForm initial={r} />
                    </td>
                  </tr>
                ))}

                {rows.length === 0 ? (
                  <tr>
                    <td className="py-6 text-sm text-slate-600" colSpan={7}>
                      No bets yet. Add your first bet above.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border bg-red-50 p-3 text-sm text-red-700">
              Bets query error: {error.message}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}