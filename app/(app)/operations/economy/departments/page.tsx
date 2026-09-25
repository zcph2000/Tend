import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Building2, PawPrint, Sprout } from "lucide-react";
import AddDepartmentForm from "./AddDepartmentForm";

export default async function DepartmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  if (!farm) {
    return (
      <div className="card text-center py-8">
        <p className="text-earth-300 text-sm">Opret din gård i Indstillinger først</p>
      </div>
    );
  }

  const [
    { data: departments },
    { data: flocks },
    { data: speciesLinks },
  ] = await Promise.all([
    supabase.from("departments").select("*").eq("farm_id", farm.id).order("name"),
    supabase.from("flocks").select("id, department_id").eq("farm_id", farm.id),
    supabase.from("department_species_links").select("department_id").eq("farm_id", farm.id),
  ]);

  const flockCountByDept = (flocks ?? []).reduce<Record<string, number>>((acc, f) => {
    if (f.department_id) acc[f.department_id] = (acc[f.department_id] ?? 0) + 1;
    return acc;
  }, {});
  const speciesCountByDept = (speciesLinks ?? []).reduce<Record<string, number>>((acc, l) => {
    acc[l.department_id] = (acc[l.department_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Link href="/operations/economy" className="text-earth-300">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-earth-50">Afdelinger</h1>
          <p className="text-earth-300 text-sm mt-0.5">
            Grupér flokke og afgrødearter så du kan se rentabilitet pr. afdeling
          </p>
        </div>
      </div>

      {departments && departments.length > 0 ? (
        <div className="space-y-3">
          {departments.map((d) => (
            <Link
              key={d.id}
              href={`/operations/economy/departments/${d.id}`}
              className="card block hover:brightness-110 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-earth-50">{d.name}</h3>
                  <div className="flex gap-3 mt-1 text-xs text-earth-300">
                    <span className="flex items-center gap-1">
                      <PawPrint size={12} /> {flockCountByDept[d.id] ?? 0} flokke
                    </span>
                    <span className="flex items-center gap-1">
                      <Sprout size={12} /> {speciesCountByDept[d.id] ?? 0} afgrødearter
                    </span>
                  </div>
                  {d.notes && <p className="text-xs text-earth-400 mt-1">{d.notes}</p>}
                </div>
                <span className="text-earth-200 text-lg flex-shrink-0">→</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center py-8">
          <div className="flex justify-center mb-3"><Building2 size={36} className="text-earth-400" /></div>
          <p className="text-earth-300 font-medium">Ingen afdelinger endnu</p>
          <p className="text-earth-200 text-sm mt-1">
            Opret fx "Grøntsager", "Får" eller "Høns" nedenfor
          </p>
        </div>
      )}

      <AddDepartmentForm farmId={farm.id} />
    </div>
  );
}
