"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

type SettleStatus = "won" | "lost" | "void";

function toNumber(v: FormDataEntryValue | null) {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : NaN;
}

export async function addBet(formData: FormData) {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const bookmaker_account_id = String(formData.get("bookmaker_account_id") ?? "");
  const event_name = String(formData.get("event_name") ?? "").trim();
  const selection = String(formData.get("selection") ?? "").trim();

  const odds = toNumber(formData.get("odds"));
  const stake = toNumber(formData.get("stake"));

  // Server-side defaults (your bets table has NOT NULL sport/market)
  const sport = "Football";
  const market = "Match Odds";

  if (!bookmaker_account_id) throw new Error("bookmaker_account_id missing");
  if (!event_name) throw new Error("event_name missing");
  if (!Number.isFinite(odds) || odds <= 1) throw new Error("odds must be > 1");
  if (!Number.isFinite(stake) || stake <= 0) throw new Error("stake must be > 0");

  // New bet is ALWAYS pending (discipline-first)
  const { error: insertError } = await supabase.from("bets").insert({
    user_id: user.id,
    bookmaker_account_id,
    placed_at: new Date().toISOString(),
    sport,
    market,
    event_name,
    selection: selection || null,
    odds,
    stake,
    status: "pending",
    profit_loss: 0,
    settled_at: null,
  });

  if (insertError) throw new Error(insertError.message);

  redirect("/bets");
}

export async function settleBet(formData: FormData) {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const bet_id = String(formData.get("bet_id") ?? "");
  const status = String(formData.get("status") ?? "") as SettleStatus;

  if (!bet_id) throw new Error("bet_id missing");
  if (!["won", "lost", "void"].includes(status)) throw new Error("invalid status");

  // Fetch stake+odds so the client cannot spoof P/L
  const { data: bet, error: betFetchError } = await supabase
    .from("bets")
    .select("id, user_id, stake, odds, status")
    .eq("id", bet_id)
    .maybeSingle();

  if (betFetchError) throw new Error(betFetchError.message);
  if (!bet) throw new Error("bet not found");
  if (bet.user_id !== user.id) throw new Error("not allowed");

  const stake = Number(bet.stake);
  const odds = Number(bet.odds);

  if (!Number.isFinite(stake) || stake <= 0) throw new Error("invalid stake");
  if (!Number.isFinite(odds) || odds <= 1) throw new Error("invalid odds");

  let profit_loss = 0;
  if (status === "won") profit_loss = stake * (odds - 1);
  if (status === "lost") profit_loss = -stake;
  if (status === "void") profit_loss = 0;

  const { error: updateError } = await supabase
    .from("bets")
    .update({
      status,
      profit_loss,
      settled_at: new Date().toISOString(),
    })
    .eq("id", bet_id)
    .eq("user_id", user.id);

  if (updateError) throw new Error(updateError.message);

  redirect("/bets");
}