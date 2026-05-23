import { createClient } from "@/lib/supabase/server";
import FarmSettingsForm from "./FarmSettingsForm";
import LogoutButton from "./LogoutButton";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: farm } = await supabase
    .from("farms")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-semibold text-earth-50 mb-1">Din konto</h2>
        <p className="text-earth-300 text-sm">{user?.email}</p>
      </div>

      <FarmSettingsForm farm={farm} userId={user!.id} />

      <div className="card">
        <h3 className="font-semibold text-earth-100 mb-3">Om Tend</h3>
        <p className="text-earth-300 text-sm">
          Tend er et regenerativt gårdsstyringsværktøj bygget på principper fra
          holistic management og adaptive multi-paddock grazing.
        </p>
        <p className="text-earth-200 text-xs mt-2">Version 0.1.0 · 2025</p>
      </div>

      <LogoutButton />
    </div>
  );
}
