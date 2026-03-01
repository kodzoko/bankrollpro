import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message, message }, { status });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  // Next 16 params may be Promise
  const resolvedParams =
    typeof (ctx.params as any)?.then === "function"
      ? await (ctx.params as Promise<{ id: string }>)
      : (ctx.params as { id: string });

  const id = resolvedParams?.id;
  if (!id) return jsonError("Missing account id.", 400);

  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return jsonError("Not authenticated.", 401);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const n = Number(body?.current_balance);
  if (!Number.isFinite(n) || n < 0) {
    return jsonError("current_balance must be a valid number (0 or higher).", 400);
  }

  // Güvenlik: sadece kendi satırını update edebilsin
  const { error } = await supabase
    .from("bookmaker_accounts")
    .update({ current_balance: n })
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true });
}