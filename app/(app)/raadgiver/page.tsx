import { createClient } from "@/lib/supabase/server";
import ChatInterface from "./ChatInterface";

export default async function RaadgiverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: farm } = await supabase
    .from("farms")
    .select("id")
    .eq("user_id", user!.id)
    .single();

  return <ChatInterface userId={user!.id} farmId={farm?.id ?? ""} />;
}
