import { supabaseServer } from "@/lib/supabase/server";
import AddBetForm from "./AddBetForm";
import EditBetForm from "./EditBetForm";

export default async function BetsPage() {
  const supabase = await supabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const userId = session.user.id;

  const { data: bets } = await supabase
    .from("bets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Bets</h1>

      <AddBetForm />

      <div className="space-y-4">
        {bets?.map((bet) => (
          <EditBetForm key={bet.id} bet={bet} />
        ))}
      </div>
    </div>
  );
}
