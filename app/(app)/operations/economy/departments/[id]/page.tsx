import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DepartmentDetailManager, { type SpeciesOption } from "./DepartmentDetailManager";

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
  if (!farm) return notFound();

  const [
    { data: department },
    { data: flocks },
    { data: speciesRows },
    { data: links },
    { data: allDepartments },
  ] = await Promise.all([
    supabase.from("departments").select("*").eq("id", id).eq("farm_id", farm.id).single(),
    supabase.from("flocks").select("id, name, department_id").eq("farm_id", farm.id).order("name"),
    supabase
      .from("crop_species")
      .select("id, name_da, family_id, crop_families(name_da)")
      .order("name_da"),
    supabase.from("department_species_links").select("*").eq("farm_id", farm.id),
    supabase.from("departments").select("id, name").eq("farm_id", farm.id).order("name"),
  ]);

  if (!department) return notFound();

  const species: SpeciesOption[] = (speciesRows ?? [])
    .map((s) => ({
      id: s.id,
      name_da: s.name_da,
      family_name: (s.crop_families as unknown as { name_da: string } | null)?.name_da ?? "Andet",
    }))
    .sort((a, b) => a.family_name.localeCompare(b.family_name, "da") || a.name_da.localeCompare(b.name_da, "da"));

  const linkBySpecies = (links ?? []).reduce<Record<string, string>>((acc, l) => {
    acc[l.species_id] = l.department_id;
    return acc;
  }, {});

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Link href="/operations/economy/departments" className="text-earth-300">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold text-earth-50">{department.name}</h1>
      </div>

      <DepartmentDetailManager
        farmId={farm.id}
        department={department}
        flocks={flocks ?? []}
        species={species}
        linkBySpecies={linkBySpecies}
        allDepartments={(allDepartments ?? []).filter((d) => d.id !== department.id)}
      />
    </div>
  );
}
