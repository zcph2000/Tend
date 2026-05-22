import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/ui/BottomNav";
import TopBar from "@/components/ui/TopBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
