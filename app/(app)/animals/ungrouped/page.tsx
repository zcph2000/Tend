import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

const sexLabel: Record<string, string> = {
  female: "Får", male: "Vædder", castrated: "Kastrat", unknown: "Ukendt",
};

export default async function UngroupedAnimalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: farm } = await supabase
    .from("farms").select("id").eq("user_id", user!.id).single();

  const { data: animals } = farm ? await supabase
    .from("animals")
    .select("id, ear_tag, name, sex, breed, birth_date")
    .eq("farm_id", farm.id)
    .eq("status", "active")
    .is("group_id", null)
    .order("ear_tag")
  : { data: [] };

  return (
    <div className="space-y-4">
      <Link href="/animals" className="text-sm text-earth-500 flex items-center gap-1">
        ← Alle dyr
      </Link>

      <div className="card bg-earth-100 border-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-earth-700">Ingen gruppe</h1>
            <p className="text-sm text-earth-500 mt-0.5">{animals?.length ?? 0} dyr</p>
          </div>
          <span className="text-3xl">🐾</span>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {!animals || animals.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-earth-400 text-sm">Alle dyr er tildelt en gruppe</p>
          </div>
        ) : (
          animals.map((animal, i) => (
            <Link
              key={animal.id}
              href={`/animals/${animal.id}`}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-earth-50 transition-colors ${
                i < animals.length - 1 ? "border-b border-earth-100" : ""
              }`}
            >
              <div className="w-9 h-9 bg-earth-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-base">🐑</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-earth-900 text-sm truncate">
                    {animal.name ?? animal.ear_tag}
                  </p>
                  {animal.name && (
                    <p className="text-xs text-earth-400 truncate">{animal.ear_tag}</p>
                  )}
                </div>
                <p className="text-xs text-earth-500 mt-0.5">
                  {sexLabel[animal.sex]} · {animal.breed ?? "Ukendt race"}
                  {animal.birth_date && ` · ${formatDate(animal.birth_date)}`}
                </p>
              </div>
              <span className="text-earth-300 text-lg flex-shrink-0">›</span>
            </Link>
          ))
        )}
      </div>

      <Link href="/animals/new" className="btn-secondary w-full text-center block">
        + Tilføj nyt dyr
      </Link>
    </div>
  );
}
