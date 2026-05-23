import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GROUP_COLORS } from "@/lib/groups";
import { GroupColor } from "@/types";
import { PawPrint } from "lucide-react";
import ManageGroupAnimals from "./ManageGroupAnimals";

export default async function GroupDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("animal_groups")
    .select("*")
    .eq("id", id)
    .single();

  if (!group) notFound();

  // Alle aktive dyr på gården
  const { data: animals } = await supabase
    .from("animals")
    .select("id, ear_tag, name, sex, group_id")
    .eq("farm_id", group.farm_id)
    .eq("status", "active")
    .order("ear_tag");

  // Alle grupper — til at vise hvilken gruppe et dyr er i
  const { data: allGroups } = await supabase
    .from("animal_groups")
    .select("id, name")
    .eq("farm_id", group.farm_id)
    .order("name");

  const colors = GROUP_COLORS[group.color as GroupColor] ?? GROUP_COLORS.grass;
  const inGroupCount = animals?.filter(a => a.group_id === id).length ?? 0;

  return (
    <div className="space-y-4">
      <Link href="/animals/groups" className="text-sm text-earth-300 flex items-center gap-1">
        ← Grupper
      </Link>

      {/* Gruppe-header */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${colors.dot}`} />
            <div>
              <h1 className="text-xl font-bold text-earth-50">{group.name}</h1>
              <p className="text-sm text-earth-300 mt-0.5">{inGroupCount} dyr</p>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-earth-800 flex items-center justify-center flex-shrink-0">
            <PawPrint size={24} className="text-earth-200" />
          </div>
        </div>
        {group.description && (
          <p className="text-sm text-earth-300 mt-3 pt-3 border-t border-white/10">
            {group.description}
          </p>
        )}
      </div>

      {/* Interaktiv dyreliste */}
      <ManageGroupAnimals
        groupId={id}
        animals={animals ?? []}
        allGroups={allGroups ?? []}
      />

      <Link href="/animals/new" className="btn-primary w-full text-center block">
        + Tilføj nyt dyr
      </Link>
    </div>
  );
}
