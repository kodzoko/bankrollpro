import { supabaseServer } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await supabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const userId = session.user.id;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Kelly Settings</h1>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
