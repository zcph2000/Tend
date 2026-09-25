"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check, PawPrint, Sprout } from "lucide-react";
import type { Department } from "@/types";

export type SpeciesOption = { id: string; name_da: string; family_name: string; grown: boolean };
type FlockOption = { id: string; name: string; department_id: string | null };
type DepartmentOption = { id: string; name: string };

export default function DepartmentDetailManager({
  farmId,
  department,
  flocks,
  species,
  linkBySpecies,
  allDepartments,
}: {
  farmId: string;
  department: Department;
  flocks: FlockOption[];
  species: SpeciesOption[];
  linkBySpecies: Record<string, string>;
  allDepartments: DepartmentOption[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(department.name);
  const [notes, setNotes] = useState(department.notes ?? "");
  const [savingInfo, setSavingInfo] = useState(false);
  const [savedInfo, setSavedInfo] = useState(false);
  const [busyFlockId, setBusyFlockId] = useState<string | null>(null);
  const [busySpeciesId, setBusySpeciesId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  const deptNameById = useMemo(
    () => allDepartments.reduce<Record<string, string>>((acc, d) => ({ ...acc, [d.id]: d.name }), {}),
    [allDepartments]
  );

  // "Dine afgrøder" = arter du rent faktisk har plantet, eller som allerede er
  // tilknyttet denne afdeling. Resten af det globale artskatalog holdes skjult
  // bag en "vis hele kataloget"-knap, til de sjældne gange du vil forberede en
  // afdeling til noget du planlægger at dyrke.
  const grownSpecies = useMemo(
    () => species.filter((s) => s.grown || linkBySpecies[s.id] === department.id),
    [species, linkBySpecies, department.id]
  );
  const catalogOnlySpecies = useMemo(
    () => species.filter((s) => !s.grown && linkBySpecies[s.id] !== department.id),
    [species, linkBySpecies, department.id]
  );

  function groupByFamily(list: SpeciesOption[]) {
    const map = new Map<string, SpeciesOption[]>();
    for (const s of list) {
      const l = map.get(s.family_name) ?? [];
      l.push(s);
      map.set(s.family_name, l);
    }
    return Array.from(map.entries());
  }

  const grownByFamily = useMemo(() => groupByFamily(grownSpecies), [grownSpecies]);
  const catalogByFamily = useMemo(() => groupByFamily(catalogOnlySpecies), [catalogOnlySpecies]);

  async function saveInfo() {
    if (!name) return;
    setSavingInfo(true);
    await supabase.from("departments").update({ name, notes: notes || null }).eq("id", department.id);
    setSavingInfo(false);
    setSavedInfo(true);
    setTimeout(() => setSavedInfo(false), 1500);
    router.refresh();
  }

  async function toggleFlock(flock: FlockOption) {
    setBusyFlockId(flock.id);
    const nowAssigned = flock.department_id === department.id;
    await supabase
      .from("flocks")
      .update({ department_id: nowAssigned ? null : department.id })
      .eq("id", flock.id);
    setBusyFlockId(null);
    router.refresh();
  }

  async function toggleSpecies(s: SpeciesOption) {
    setBusySpeciesId(s.id);
    const currentDept = linkBySpecies[s.id];
    if (currentDept === department.id) {
      await supabase
        .from("department_species_links")
        .delete()
        .eq("farm_id", farmId)
        .eq("species_id", s.id);
    } else {
      await supabase
        .from("department_species_links")
        .upsert(
          { farm_id: farmId, department_id: department.id, species_id: s.id },
          { onConflict: "farm_id,species_id" }
        );
    }
    setBusySpeciesId(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    await supabase.from("departments").delete().eq("id", department.id);
    router.push("/operations/economy/departments");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Navn / noter */}
      <div className="card space-y-3">
        <div>
          <label className="label">Navn</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Noter</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button
          onClick={saveInfo}
          disabled={savingInfo || !name || (name === department.name && notes === (department.notes ?? ""))}
          className="btn-secondary w-full"
        >
          {savingInfo ? "Gemmer..." : savedInfo ? <span className="flex items-center justify-center gap-1"><Check size={14} /> Gemt</span> : "Gem ændringer"}
        </button>
      </div>

      {/* Flokke */}
      <div className="card space-y-2">
        <h3 className="font-semibold text-earth-50 flex items-center gap-1.5">
          <PawPrint size={16} /> Flokke
        </h3>
        {flocks.length === 0 ? (
          <p className="text-xs text-earth-400">Ingen flokke oprettet endnu</p>
        ) : (
          <div className="space-y-1.5">
            {flocks.map((f) => {
              const assignedHere = f.department_id === department.id;
              const assignedElsewhere = f.department_id && !assignedHere ? deptNameById[f.department_id] : null;
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFlock(f)}
                  disabled={busyFlockId === f.id}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{
                    background: assignedHere ? "rgba(163,230,53,0.12)" : "var(--surface-raised)",
                    color: assignedHere ? "#a3e635" : "var(--text-primary, #f5f0e8)",
                  }}
                >
                  <span>{f.name}</span>
                  <span className="text-xs text-earth-400">
                    {assignedHere ? <Check size={14} /> : assignedElsewhere ? `hører til ${assignedElsewhere}` : "ikke tildelt"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Afgrødearter */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-earth-50 flex items-center gap-1.5">
          <Sprout size={16} /> Dine afgrøder
        </h3>
        {grownByFamily.length === 0 ? (
          <p className="text-xs text-earth-400">
            Du har endnu ikke plantet noget knyttet til en registreret sort — brug "vis hele artskataloget" nedenfor for at forberede en afdeling alligevel.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {grownByFamily.map(([family, list]) => (
              <SpeciesFamilyGroup
                key={family}
                family={family}
                list={list}
                department={department}
                linkBySpecies={linkBySpecies}
                deptNameById={deptNameById}
                busySpeciesId={busySpeciesId}
                onToggle={toggleSpecies}
              />
            ))}
          </div>
        )}
        <p className="text-[10px] text-earth-500">
          Stiplet ramme = tilhører allerede en anden afdeling. Klik for at flytte den hertil.
        </p>

        <button
          type="button"
          onClick={() => setShowCatalog((v) => !v)}
          className="text-xs text-earth-300 underline"
        >
          {showCatalog ? "Skjul hele artskataloget" : `Vis hele artskataloget (${catalogOnlySpecies.length} arter du ikke dyrker endnu)`}
        </button>

        {showCatalog && (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1 pt-2 border-t border-white/5">
            {catalogByFamily.map(([family, list]) => (
              <SpeciesFamilyGroup
                key={family}
                family={family}
                list={list}
                department={department}
                linkBySpecies={linkBySpecies}
                deptNameById={deptNameById}
                busySpeciesId={busySpeciesId}
                onToggle={toggleSpecies}
              />
            ))}
          </div>
        )}
      </div>

      {/* Slet */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
        <h3 className="font-semibold text-red-400 text-sm">Slet afdeling</h3>
        <p className="text-xs text-earth-300">
          Flokke og afgrødearter mister blot deres tilknytning — de slettes ikke.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: confirmDelete ? "#dc2626" : "rgba(239,68,68,0.12)",
            color: confirmDelete ? "#fff" : "#f87171",
          }}
        >
          {deleting ? "Sletter..." : confirmDelete ? "Tryk igen for at bekræfte sletning" : "Slet afdeling"}
        </button>
      </div>
    </div>
  );
}

function SpeciesFamilyGroup({
  family,
  list,
  department,
  linkBySpecies,
  deptNameById,
  busySpeciesId,
  onToggle,
}: {
  family: string;
  list: SpeciesOption[];
  department: Department;
  linkBySpecies: Record<string, string>;
  deptNameById: Record<string, string>;
  busySpeciesId: string | null;
  onToggle: (s: SpeciesOption) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-earth-500 uppercase tracking-widest mb-1.5">{family}</p>
      <div className="flex flex-wrap gap-1.5">
        {list.map((s) => {
          const assignedHere = linkBySpecies[s.id] === department.id;
          const assignedElsewhere = linkBySpecies[s.id] && !assignedHere ? deptNameById[linkBySpecies[s.id]] : null;
          return (
            <button
              key={s.id}
              onClick={() => onToggle(s)}
              disabled={busySpeciesId === s.id}
              title={assignedElsewhere ? `Hører i øjeblikket til ${assignedElsewhere} — klik for at flytte hertil` : undefined}
              className="px-2.5 py-1 rounded-full text-xs transition-colors"
              style={{
                background: assignedHere ? "rgba(163,230,53,0.15)" : "var(--surface-raised)",
                color: assignedHere ? "#a3e635" : assignedElsewhere ? "var(--text-muted)" : "var(--text-primary, #f5f0e8)",
                border: assignedElsewhere ? "1px dashed rgba(255,255,255,0.15)" : "1px solid transparent",
              }}
            >
              {s.name_da}
            </button>
          );
        })}
      </div>
    </div>
  );
}
