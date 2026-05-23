import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import ManageFlockAnimals from "./ManageFlockAnimals";
import { PawPrint } from "lucide-react";

export default async function FlockDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: flock } = await supabase
    .from("flocks")
    .select("*")
    .eq("id", id)
    .single();

  if (!flock) notFound();

  // Alle aktive dyr på gården med gruppe-info og nuværende flok
  const { data: animals } = await supabase
    .from("animals")
    .select("id, ear_tag, name, sex, flock_id, group:animal_groups(id, name, color)")
    .eq("farm_id", flock.farm_id)
    .eq("status", "active")
    .order("ear_tag");

  // Alle grupper — til at strukturere listen
  const { data: groups } = await supabase
    .from("animal_groups")
    .select("id, name, color")
    .eq("farm_id", flock.farm_id)
    .order("name");

  const inFlockCount = animals?.filter(a => a.flock_id === id).length ?? 0;

  // Normaliser Supabase's join-resultat (kan komme som array)
  const normalizedAnimals = (animals ?? []).map(a => ({
    ...a,
    group: Array.isArray(a.group) ? (a.group[0] ?? null) : a.group,
  }));

  return (
    <div className="space-y-4">
      <Link href="/animals/flocks" className="text-sm text-earth-300 flex items-center gap-1">
        ← Flokke
      </Link>

      {/* Flok-header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-earth-50">{flock.name}</h1>
            <p className="text-earth-300 text-sm mt-0.5">{inFlockCount} dyr i flokken</p>
          </div>
          <div className="w-12 h-12 bg-earth-800 rounded-2xl flex items-center justify-center flex-shrink-0">
            <PawPrint size={24} className="text-earth-200" />
          </div>
        </div>
        {flock.notes && (
          <p className="text-earth-200 text-sm mt-3 pt-3 border-t border-white/10">
            {flock.notes}
          </p>
        )}
      </div>

      {/* Interaktiv dyreliste */}
      <ManageFlockAnimals
        flockId={id}
        animals={normalizedAnimals as Parameters<typeof ManageFlockAnimals>[0]["animals"]}
        groups={groups ?? []}
      />
    </div>
  );
}
