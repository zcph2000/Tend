import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import CreateFlockForm from "./CreateFlockForm";
import { PawPrint } from "lucide-react";

export default async function FlocksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: farm } = await supabase
    .from("farms").select("id").eq("user_id", user!.id).single();

  const { data: flocks } = farm ? await supabase
    .from("flocks")
    .select("id, name, notes")
    .eq("farm_id", farm.id)
    .order("name")
  : { data: [] };

  // Tæl dyr per flok
  const { data: animals } = farm ? await supabase
    .from("animals")
    .select("flock_id")
    .eq("farm_id", farm.id)
    .eq("status", "active")
    .not("flock_id", "is", null)
  : { data: [] };

  const countByFlock = (animals ?? []).reduce<Record<string, number>>((acc, a) => {
    if (a.flock_id) acc[a.flock_id] = (acc[a.flock_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Link href="/animals" className="text-sm text-earth-300 flex items-center gap-1">
        ← Alle dyr
      </Link>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-earth-50">Flokke</h2>
      </div>

      <div className="rounded-xl px-4 py-3" style={{ background: "rgba(30,80,120,0.15)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-sm text-earth-200">
          <span className="font-semibold text-earth-100">Flokke</span> er de dyr der går sammen på en mark ad gangen — uafhængigt af hvilken gruppe de tilhører. Et flok kan skifte sammensætning når du roterer.
        </p>
      </div>

      <CreateFlockForm farmId={farm?.id ?? ""} />

      {flocks && flocks.length > 0 ? (
        <div className="space-y-2">
          {flocks.map(flock => {
            const count = countByFlock[flock.id] ?? 0;
            return (
              <Link
                key={flock.id}
                href={`/animals/flocks/${flock.id}`}
                className="card flex items-center gap-4 hover:brightness-110 transition-all"
              >
                <div className="w-12 h-12 bg-earth-800 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <PawPrint size={22} className="text-earth-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-earth-50">{flock.name}</p>
                  {flock.notes && (
                    <p className="text-xs text-earth-200 truncate mt-0.5">{flock.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="badge bg-earth-800 text-earth-100 font-semibold">
                    {count} dyr
                  </span>
                  <span className="text-earth-100 text-lg">›</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-8">
          <div className="flex justify-center mb-2"><PawPrint size={32} className="text-earth-400" /></div>
          <p className="text-earth-300 text-sm">Ingen flokke endnu</p>
          <p className="text-earth-200 text-xs mt-1">Opret din første flok ovenfor</p>
        </div>
      )}
    </div>
  );
}
