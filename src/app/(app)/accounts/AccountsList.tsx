"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  name: string;
  currency: string;
  current_balance: number;
};

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

export default function AccountsList({ initial }: { initial: Account[] }) {
  const router = useRouter();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [value, setValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const current = useMemo(
    () => initial.find((a) => a.id === editingId) ?? null,
    [initial, editingId]
  );

  function startEdit(a: Account) {
    setErr(null);
    setEditingId(a.id);
    setValue(String(safeNumber(a.current_balance)));
  }

  function cancel() {
    setErr(null);
    setEditingId(null);
    setValue("");
  }

  async function save() {
    if (!current) return;

    setErr(null);
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      setErr("Balance must be a valid number (0 or higher).");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/accounts/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_balance: n }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.message || json?.error || "Update failed");
        setSaving(false);
        return;
      }

      cancel();
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {err ? (
        <div className="mb-4 rounded-xl border bg-rose-50 p-3 text-sm text-rose-800">
          {err}
        </div>
      ) : null}

      <div className="divide-y">
        {initial.map((a) => {
          const isEditing = editingId === a.id;

          return (
            <div key={a.id} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <div className="truncate font-semibold">{a.name}</div>
                <div className="text-sm text-slate-600">{a.currency}</div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-slate-500">Balance</div>

                  {!isEditing ? (
                    <div className="font-bold">
                      {formatMoney(safeNumber(a.current_balance), a.currency || "GBP")}
                    </div>
                  ) : (
                    <input
                      className="w-36 rounded-xl border bg-white px-3 py-2 text-sm"
                      inputMode="decimal"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="e.g. 500"
                    />
                  )}
                </div>

                {!isEditing ? (
                  <button
                    onClick={() => startEdit(a)}
                    className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={cancel}
                      disabled={saving}
                      className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={save}
                      disabled={saving}
                      className="rounded-xl bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}