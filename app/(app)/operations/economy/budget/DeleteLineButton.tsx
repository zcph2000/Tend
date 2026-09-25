"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DeleteLineButton({ lineId }: { lineId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleDelete() {
    setBusy(true);
    await supabase.from("budget_lines").delete().eq("id", lineId);
    router.refresh();
  }

  return (
    <button type="button" onClick={handleDelete} disabled={busy} title="Slet linje" className="flex-shrink-0 p-1">
      <X size={13} className="text-earth-600" />
    </button>
  );
}
