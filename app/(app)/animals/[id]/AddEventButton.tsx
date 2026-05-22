"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Ram { id: string; ear_tag: string; name: string | null; }
interface Group { id: string; name: string; color: string; }
interface Lamb { ear_tag: string; sex: string; name: string; }

const eventTypes = [
  { value: "vaccination", label: "Vaccination", icon: "💉" },
  { value: "worming",     label: "Ormekur",     icon: "💊" },
  { value: "tupping",     label: "Til vædder",  icon: "🐏" },
  { value: "lambing",     label: "Lammede",     icon: "🐑" },
  { value: "weighing",    label: "Vejet",        icon: "⚖️" },
  { value: "treatment",   label: "Behandling",  icon: "🏥" },
  { value: "observation", label: "Observation", icon: "👁️" },
  { value: "note",        label: "Note",        icon: "📝" },
];

export default function AddEventButton({
  animalId,
  farmId,
}: {
  animalId: string;
  farmId: string;
  rams?: Ram[];
}) {
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState("vaccination");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [extraData, setExtraData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Lambing-specifikt
  const [lambCount, setLambCount] = useState(1);
  const [selectedRamId, setSelectedRamId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [lambs, setLambs] = useState<Lamb[]>([{ ear_tag: "", sex: "female", name: "" }]);
  const [rams, setRams] = useState<Ram[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [animalBreed, setAnimalBreed] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  // Hent væddere og grupper når lambing vælges
  useEffect(() => {
    if (eventType !== "lambing") return;
    async function fetchData() {
      const [{ data: ramsData }, { data: groupsData }, { data: animalData }] = await Promise.all([
        supabase.from("animals").select("id, ear_tag, name").eq("farm_id", farmId).eq("sex", "male").eq("status", "active"),
        supabase.from("animal_groups").select("id, name, color").eq("farm_id", farmId),
        supabase.from("animals").select("breed").eq("id", animalId).single(),
      ]);
      setRams(ramsData ?? []);
      setGroups(groupsData ?? []);
      setAnimalBreed(animalData?.breed ?? null);
    }
    fetchData();
  }, [eventType, farmId, animalId]);

  // Synkroniser lam-array med antal
  useEffect(() => {
    setLambs(prev => {
      const next = [...prev];
      while (next.length < lambCount) next.push({ ear_tag: "", sex: "female", name: "" });
      return next.slice(0, lambCount);
    });
  }, [lambCount]);

  function updateLamb(i: number, field: keyof Lamb, value: string) {
    setLambs(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  async function handleSave() {
    setLoading(true);

    if (eventType === "lambing") {
      // 1. Gem lammingshændelse på moderen
      await supabase.from("animal_events").insert({
        animal_id: animalId,
        farm_id: farmId,
        event_type: "lambing",
        event_date: date,
        data: { lamb_count: lambCount, father_ear_tag: rams.find(r => r.id === selectedRamId)?.ear_tag ?? "" },
        notes: notes || null,
      });

      // 2. Opret hvert lam som et rigtigt dyr
      const lambRecords = lambs.map((lamb, i) => ({
        farm_id: farmId,
        ear_tag: lamb.ear_tag || `Lam-${date}-${i + 1}`,
        name: lamb.name || null,
        species: "sheep",
        breed: animalBreed,
        sex: lamb.sex,
        birth_date: date,
        mother_id: animalId,
        father_id: selectedRamId || null,
        group_id: selectedGroupId || null,
        status: "active",
        notes: null,
      }));

      await supabase.from("animals").insert(lambRecords);

    } else {
      // Standard hændelse
      await supabase.from("animal_events").insert({
        animal_id: animalId,
        farm_id: farmId,
        event_type: eventType,
        event_date: date,
        notes: notes || null,
        data: extraData,
      });
    }

    setLoading(false);
    setOpen(false);
    setNotes("");
    setExtraData({});
    setLambs([{ ear_tag: "", sex: "female", name: "" }]);
    setLambCount(1);
    setSelectedRamId("");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        + Tilføj hændelse
      </button>
    );
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-earth-900">Ny hændelse</h3>

      {/* Hændelsestype */}
      <div>
        <label className="label">Type</label>
        <div className="grid grid-cols-4 gap-2">
          {eventTypes.map(et => (
            <button key={et.value} onClick={() => setEventType(et.value)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-colors text-xs ${
                eventType === et.value
                  ? "border-grass-500 bg-grass-50 text-grass-700"
                  : "border-earth-200 text-earth-500"
              }`}>
              <span className="text-lg">{et.icon}</span>
              <span className="leading-tight text-center">{et.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Dato</label>
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {/* LAMBING-FLOW */}
      {eventType === "lambing" && (
        <div className="space-y-4 bg-grass-50 rounded-xl p-4 border border-grass-200">
          <p className="text-sm font-semibold text-grass-800">🐑 Lammingsregistrering</p>

          <div>
            <label className="label">Antal lam</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(n => (
                <button key={n} type="button" onClick={() => setLambCount(n)}
                  className={`flex-1 py-2 rounded-xl font-bold text-lg border-2 transition-colors ${
                    lambCount === n ? "border-grass-500 bg-grass-100 text-grass-800" : "border-earth-200 text-earth-500"
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Vædder (far)</label>
            <select className="input" value={selectedRamId} onChange={e => setSelectedRamId(e.target.value)}>
              <option value="">Ukendt / vælg vædder</option>
              {rams.map(r => (
                <option key={r.id} value={r.id}>{r.name ?? r.ear_tag} ({r.ear_tag})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Tilføj lam til gruppe</label>
            <select className="input" value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
              <option value="">Ingen gruppe</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Et felt per lam */}
          <div className="space-y-3">
            <label className="label">Lammene</label>
            {lambs.map((lamb, i) => (
              <div key={i} className="bg-white rounded-xl p-3 space-y-2 border border-grass-200">
                <p className="text-xs font-semibold text-earth-600">Lam {i + 1}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Øremærke</label>
                    <input className="input text-sm" value={lamb.ear_tag}
                      onChange={e => updateLamb(i, "ear_tag", e.target.value)}
                      placeholder="DK-xxxx (valgfri)" />
                  </div>
                  <div>
                    <label className="label text-xs">Køn</label>
                    <select className="input text-sm" value={lamb.sex}
                      onChange={e => updateLamb(i, "sex", e.target.value)}>
                      <option value="female">Gimmer ♀</option>
                      <option value="male">Vædderlam ♂</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label text-xs">Kaldenavn (valgfri)</label>
                  <input className="input text-sm" value={lamb.name}
                    onChange={e => updateLamb(i, "name", e.target.value)}
                    placeholder="Valgfri" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standard ekstrafelter */}
      {eventType === "weighing" && (
        <div>
          <label className="label">Vægt (kg)</label>
          <input type="number" className="input" placeholder="fx 45"
            onChange={e => setExtraData(d => ({ ...d, weight_kg: e.target.value }))} />
        </div>
      )}
      {eventType === "vaccination" && (
        <div>
          <label className="label">Vaccine</label>
          <input type="text" className="input" placeholder="fx Heptavac-P Plus"
            onChange={e => setExtraData(d => ({ ...d, vaccine: e.target.value }))} />
        </div>
      )}
      {eventType === "worming" && (
        <div>
          <label className="label">Præparat</label>
          <input type="text" className="input" placeholder="fx Zolvix, Cydectin..."
            onChange={e => setExtraData(d => ({ ...d, product: e.target.value }))} />
        </div>
      )}
      {eventType === "tupping" && (
        <div>
          <label className="label">Vædder</label>
          <input type="text" className="input" placeholder="Vædderens øremærke"
            onChange={e => setExtraData(d => ({ ...d, ram: e.target.value }))} />
        </div>
      )}

      <div>
        <label className="label">Noter</label>
        <textarea className="input" rows={2} value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Eventuelle bemærkninger..." />
      </div>

      <div className="flex gap-3">
        <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Annuller</button>
        <button onClick={handleSave} disabled={loading} className="btn-primary flex-1">
          {loading ? "Gemmer..." : eventType === "lambing" ? `Registrer ${lambCount} lam` : "Gem"}
        </button>
      </div>
    </div>
  );
}
