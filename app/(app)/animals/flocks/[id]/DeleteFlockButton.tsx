"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toISODate } from "@/lib/calendarEvents";

export default function DeleteFlockButton({ flockId, animalCount }: { flockId: string; animalCount: number }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    setError(null);

    // Luk evt. åben afgræsning for flokken, så der ikke bliver en løsrevet
    // rotationspåmindelse tilbage, når flokken forsvinder.
    await supabase
      .from("grazing_records")
      .update({ end_date: toISODate(new Date()) })
      .eq("flock_id", flockId)
      .is("end_date", null);

    const { error: deleteErr } = await supabase.from("flocks").delete().eq("id", flockId);

    if (deleteErr) {
      setDeleting(false);
      setConfirmDelete(false);
      setError(deleteErr.message);
      return;
    }

    router.push("/animals/flocks");
    router.refresh();
  }

  return (
    <div className="card space-y-3" style={{ borderColor: "rgba(239,68,68,0.25)" }}>
      <h3 className="font-semibold text-red-400 text-sm">Slet flok</h3>
      <p className="text-xs text-earth-300">
        Sletter flokken permanent. {animalCount > 0
          ? `${animalCount} dyr i flokken mister deres floktilknytning, men slettes ikke.`
          : "Kan ikke fortrydes."}
      </p>
      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
        style={{
          background: confirmDelete ? "#dc2626" : "rgba(239,68,68,0.12)",
          color: confirmDelete ? "#fff" : "#f87171",
        }}
      >
        {deleting ? "Sletter…" : confirmDelete ? "Tryk igen for at bekræfte sletning" : "Slet flok"}
      </button>
    </div>
  );
}
