import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Scissors, Sprout, Bird } from "lucide-react";
import { nextPruningWindow, pruningTaskDates } from "@/lib/pruningWindow";
import PruneTaskButton from "../PruneTaskButton";

const MONTHS = ["", "jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const STATUS_LABEL: Record<string, string> = { planlagt: "Planlagt", etableret: "Etableret", producerer: "Producerer" };

function monthRange(from: number, to: number): string {
  return `${MONTHS[from]}–${MONTHS[to]}`;
}

export default async function FruitPlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
  if (!farm) notFound();

  const { data: plant } = await supabase
    .from("fruit_plants")
    .select(`*, crop_varieties (
      id, name, description, care_notes, pruning_month_from, pruning_month_to, pruning_notes,
      establishment_years, establishment_notes, years_to_first_harvest, animal_integration,
      crop_species ( name_da, scientific_name, crop_families ( name_da ) )
    )`)
    .eq("id", id)
    .eq("farm_id", farm.id)
    .single();

  if (!plant) notFound();

  const variety = plant.crop_varieties as any;
  const species = variety?.crop_species;

  let existingTask: { id: string; due_date: string } | null = null;
  let dueDate = "", dueDateEnd = "";
  if (variety?.pruning_month_from && variety?.pruning_month_to) {
    const { data: pending } = await supabase
      .from("farm_tasks")
      .select("id, due_date")
      .eq("fruit_plant_id", plant.id)
      .eq("task_type", "beskæring")
      .eq("status", "pending")
      .order("due_date")
      .limit(1);
    existingTask = pending?.[0] ?? null;
    const dates = pruningTaskDates(variety.pruning_month_from, variety.pruning_month_to, new Date());
    dueDate = dates.dueDate;
    dueDateEnd = dates.dueDateEnd;
  }

  return (
    <div className="space-y-4">
      <Link href="/farming/orchard" className="text-sm text-earth-300 flex items-center gap-1">
        <ArrowLeft size={14} /> Frugtplantage
      </Link>

      <div className="card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-earth-50">{plant.name}</h1>
            <p className="text-sm text-earth-300 mt-0.5">
              {species?.name_da ?? plant.species}{(variety?.name ?? plant.variety) ? ` · ${variety?.name ?? plant.variety}` : ""}
            </p>
            {species?.scientific_name && <p className="text-xs text-earth-500 italic mt-0.5">{species.scientific_name}</p>}
          </div>
          <span className="text-xs font-medium text-earth-300 flex-shrink-0">{STATUS_LABEL[plant.status] ?? plant.status}</span>
        </div>
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/5 text-xs text-earth-400">
          {plant.quantity > 1 && <span>{plant.quantity} stk</span>}
          {plant.planted_year && <span>Plantet {plant.planted_year}</span>}
          {plant.location_note && <span>{plant.location_note}</span>}
        </div>
        {plant.notes && <p className="text-sm text-earth-300 mt-2">{plant.notes}</p>}
      </div>

      {variety?.description && (
        <div className="card">
          <p className="text-xs font-semibold text-earth-400 uppercase tracking-wide mb-1.5">Om sorten</p>
          <p className="text-sm text-earth-200">{variety.description}</p>
        </div>
      )}

      {variety?.pruning_month_from && variety?.pruning_month_to && (
        <div className="card space-y-3" style={{ borderColor: "rgba(163,230,53,0.25)" }}>
          <div className="flex items-center gap-2">
            <Scissors size={16} style={{ color: "#a3e635" }} />
            <p className="font-semibold text-earth-50 text-sm">
              Beskæring: {monthRange(variety.pruning_month_from, variety.pruning_month_to)}
            </p>
          </div>
          {variety.pruning_notes && <p className="text-sm text-earth-300">{variety.pruning_notes}</p>}
          {existingTask ? (
            <p className="text-xs" style={{ color: "#a3e635" }}>✓ Opgave allerede oprettet i kalenderen</p>
          ) : (
            <PruneTaskButton
              farmId={farm.id}
              fruitPlantId={plant.id}
              title={`Beskær ${plant.name}`}
              dueDate={dueDate}
              dueDateEnd={dueDateEnd}
            />
          )}
        </div>
      )}

      {(variety?.establishment_notes || variety?.years_to_first_harvest || variety?.establishment_years) && (
        <div className="card space-y-1.5">
          <div className="flex items-center gap-2">
            <Sprout size={16} style={{ color: "#a3e635" }} />
            <p className="font-semibold text-earth-50 text-sm">Etablering</p>
          </div>
          {variety.years_to_first_harvest && (
            <p className="text-sm text-earth-300">År til første høst: <strong className="text-earth-100">{variety.years_to_first_harvest} år</strong></p>
          )}
          {variety.establishment_notes && <p className="text-sm text-earth-300">{variety.establishment_notes}</p>}
        </div>
      )}

      {variety?.animal_integration && (
        <div className="card space-y-1.5">
          <div className="flex items-center gap-2">
            <Bird size={16} style={{ color: "#fb923c" }} />
            <p className="font-semibold text-earth-50 text-sm">Dyreintegration</p>
          </div>
          <p className="text-sm text-earth-300">{variety.animal_integration}</p>
        </div>
      )}

      {variety?.care_notes && (
        <div className="card">
          <p className="text-xs font-semibold text-earth-400 uppercase tracking-wide mb-1.5">Øvrige noter</p>
          <p className="text-sm text-earth-300">{variety.care_notes}</p>
        </div>
      )}

      {!variety && (
        <div className="card">
          <p className="text-sm text-earth-400">Denne plante er ikke koblet til en sort i afgrødedatabasen, så der er ingen dyrkningsråd at vise endnu.</p>
        </div>
      )}
    </div>
  );
}
