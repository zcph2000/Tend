"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import EventIcon from "@/components/ui/EventIcon";
import type { EventType, Species } from "@/types";
import { eventTypeLabel, YOUNG_LABEL, isBatchSpecies } from "@/lib/animalTerms";

interface Parent { id: string; ear_tag: string | null; name: string | null; }
interface Group { id: string; name: string; color: string; }
interface Offspring { ear_tag: string; sex: string; name: string; }

const BASE_EVENT_TYPES: EventType[] = [
  "vaccination", "worming", "tupping", "lambing", "weighing", "treatment", "observation", "note",
];

export default function AddEventButton({
  animalId,
  farmId,
  species = "sheep",
}: {
  animalId: string;
  farmId: string;
  rams?: Parent[];
  species?: Species;
}) {
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState<EventType>("vaccination");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [extraData, setExtraData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Fødsels-specifikt (lambing-typen, kaldes noget forskelligt pr. art)
  const [offspringCount, setOffspringCount] = useState(1);
  const [selectedFatherId, setSelectedFatherId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [offspring, setOffspring] = useState<Offspring[]>([{ ear_tag: "", sex: "female", name: "" }]);
  const [fathers, setFathers] = useState<Parent[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [animalBreed, setAnimalBreed] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const eventTypes = isBatchSpecies(species)
    ? BASE_EVENT_TYPES.filter(t => t !== "tupping" && t !== "lambing")
    : BASE_EVENT_TYPES;

  const youngLabel = YOUNG_LABEL[species];

  // Hent avlshandyr og grupper når fødselshændelsen vælges
  useEffect(() => {
    if (eventType !== "lambing") return;
    async function fetchData() {
      const [{ data: fathersData }, { data: groupsData }, { data: animalData }] = await Promise.all([
        supabase.from("animals").select("id, ear_tag, name").eq("farm_id", farmId).eq("species", species).eq("sex", "male").eq("status", "active"),
        supabase.from("animal_groups").select("id, name, color").eq("farm_id", farmId),
        supabase.from("animals").select("breed").eq("id", animalId).single(),
      ]);
      setFathers(fathersData ?? []);
      setGroups(groupsData ?? []);
      setAnimalBreed(animalData?.breed ?? null);
    }
    fetchData();
  }, [eventType, farmId, animalId, species]);

  // Synkroniser afkom-array med antal
  useEffect(() => {
    setOffspring(prev => {
      const next = [...prev];
      while (next.length < offspringCount) next.push({ ear_tag: "", sex: "female", name: "" });
      return next.slice(0, offspringCount);
    });
  }, [offspringCount]);

  function updateOffspring(i: number, field: keyof Offspring, value: string) {
    setOffspring(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: value } : o));
  }

  async function handleSave() {
    setLoading(true);

    if (eventType === "lambing") {
      // 1. Gem fødselshændelsen på moderen
      await supabase.from("animal_events").insert({
        animal_id: animalId,
        farm_id: farmId,
        event_type: "lambing",
        event_date: date,
        data: { offspring_count: offspringCount, father_ear_tag: fathers.find(r => r.id === selectedFatherId)?.ear_tag ?? "" },
        notes: notes || null,
      });

      // 2. Opret hvert afkom som et rigtigt dyr
      const offspringRecords = offspring.map((o, i) => ({
        farm_id: farmId,
        ear_tag: o.ear_tag || `${youngLabel}-${date}-${i + 1}`,
        name: o.name || null,
        species,
        breed: animalBreed,
        sex: o.sex,
        birth_date: date,
        mother_id: animalId,
        father_id: selectedFatherId || null,
        group_id: selectedGroupId || null,
        status: "active",
        notes: null,
      }));

      await supabase.from("animals").insert(offspringRecords);

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
    setOffspring([{ ear_tag: "", sex: "female", name: "" }]);
    setOffspringCount(1);
    setSelectedFatherId("");
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
      <h3 className="font-semibold text-earth-50">Ny hændelse</h3>

      {/* Hændelsestype */}
      <div>
        <label className="label">Type</label>
        <div className="grid grid-cols-4 gap-2">
          {eventTypes.map(et => (
            <button key={et} onClick={() => setEventType(et)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-colors text-xs ${
                eventType === et
                  ? "border-clay-500 text-earth-50"
                  : "border-grass-700 text-earth-200"
              }`}
              style={eventType === et ? { background: "rgba(196,98,42,0.15)" } : {}}>
              <EventIcon type={et} size={16} />
              <span className="leading-tight text-center">{eventTypeLabel(et, species)}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Dato</label>
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {/* FØDSELS-FLOW */}
      {eventType === "lambing" && (
        <div className="space-y-4 bg-grass-50 rounded-xl p-4 border border-grass-200">
          <p className="text-sm font-semibold text-grass-300">{eventTypeLabel("lambing", species)}sregistrering</p>

          <div>
            <label className="label">Antal {youngLabel.toLowerCase()}</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(n => (
                <button key={n} type="button" onClick={() => setOffspringCount(n)}
                  className={`flex-1 py-2 rounded-xl font-bold text-lg border-2 transition-colors ${
                    offspringCount === n ? "border-grass-500 bg-grass-100 text-grass-800" : "border-earth-200 text-earth-300"
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Far</label>
            <select className="input" value={selectedFatherId} onChange={e => setSelectedFatherId(e.target.value)}>
              <option value="">Ukendt / vælg far</option>
              {fathers.map(r => (
                <option key={r.id} value={r.id}>{r.name ?? r.ear_tag} ({r.ear_tag})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Tilføj til gruppe</label>
            <select className="input" value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
              <option value="">Ingen gruppe</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Et felt pr. afkom */}
          <div className="space-y-3">
            <label className="label">{youngLabel}</label>
            {offspring.map((o, i) => (
              <div key={i} className="bg-white rounded-xl p-3 space-y-2 border border-grass-200">
                <p className="text-xs font-semibold text-earth-400">{youngLabel.replace(/e?r?$/, "")} {i + 1}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Øremærke</label>
                    <input className="input text-sm" value={o.ear_tag}
                      onChange={e => updateOffspring(i, "ear_tag", e.target.value)}
                      placeholder="DK-xxxx (valgfri)" />
                  </div>
                  <div>
                    <label className="label text-xs">Køn</label>
                    <select className="input text-sm" value={o.sex}
                      onChange={e => updateOffspring(i, "sex", e.target.value)}>
                      <option value="female">Hun ♀</option>
                      <option value="male">Han ♂</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label text-xs">Kaldenavn (valgfri)</label>
                  <input className="input text-sm" value={o.name}
                    onChange={e => updateOffspring(i, "name", e.target.value)}
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
          <label className="label">{eventTypeLabel("tupping", species)} — hvem?</label>
          <input type="text" className="input" placeholder="Øremærke"
            onChange={e => setExtraData(d => ({ ...d, partner: e.target.value }))} />
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
          {loading ? "Gemmer..." : eventType === "lambing" ? `Registrer ${offspringCount} ${youngLabel.toLowerCase()}` : "Gem"}
        </button>
      </div>
    </div>
  );
}
