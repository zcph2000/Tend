"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DeleteProjectButton({ projectId }: { projectId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    await supabase.from("budget_projects").delete().eq("id", projectId);
    router.push("/operations/economy/budget?mode=projekter");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
      style={{
        background: confirming ? "#dc2626" : "rgba(239,68,68,0.12)",
        color: confirming ? "#fff" : "#f87171",
      }}
    >
      {deleting ? "Sletter…" : confirming ? "Tryk igen for at bekræfte sletning" : "Slet projekt"}
    </button>
  );
}
