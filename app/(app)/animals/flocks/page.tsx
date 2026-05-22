import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import CreateFlockForm from "./CreateFlockForm";

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
      <Link href="/animals" className="text-sm text-earth-500 flex items-center gap-1">
        ← Alle dyr
      </Link>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-earth-900">Flokke</h2>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
        <p className="text-sm text-sky-800">
          <span className="font-semibold">Flokke</span> er de dyr der går sammen på en mark ad gangen — uafhængigt af hvilken gruppe de tilhører. Et flok kan skifte sammensætning når du roterer.
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
                className="card flex items-center gap-4 hover:opacity-90 transition-opacity active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-earth-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🐑</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-earth-900">{flock.name}</p>
                  {flock.notes && (
                    <p className="text-xs text-earth-400 truncate mt-0.5">{flock.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="badge bg-earth-100 text-earth-600 font-semibold">
                    {count} dyr
                  </span>
                  <span className="text-earth-300 text-lg">›</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-8">
          <p className="text-3xl mb-2">🐑</p>
          <p className="text-earth-500 text-sm">Ingen flokke endnu</p>
          <p className="text-earth-400 text-xs mt-1">Opret din første flok ovenfor</p>
        </div>
      )}
    </div>
  );
}
