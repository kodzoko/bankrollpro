import { redirect } from "next/navigation";

import SettingsForm from "./SettingsForm";
import { supabaseServer } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  const userId = auth.user?.id;
  if (!userId) {
    redirect("/login");
  }

  return (
    <main className="p-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <div className="mt-1 text-sm text-slate-600">Manage your preferences.</div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <SettingsForm />
        </div>
      </div>
    </main>
  );
}