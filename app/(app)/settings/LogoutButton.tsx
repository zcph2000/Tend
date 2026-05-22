"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const supabase = createClient();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <button onClick={logout} className="btn-secondary w-full text-red-600">
      Log ud
    </button>
  );
}
