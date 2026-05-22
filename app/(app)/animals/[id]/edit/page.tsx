"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";

const BUYER_TYPES = [
  { value: "slaughterhouse", label: "Slagteri", icon: "🏭" },
  { value: "business",       label: "Erhverv",  icon: "🤝" },
  { value: "private",        label: "Privat",   icon: "🏡" },
];

export default function EditAnimalPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    ear_tag: "",
    name: "",
    species: "sheep",
    breed: "",
    sex: "female",
    birth_date: "",
    notes: "",
    status: "active",
  });

  // Salgsdata — vises når status = "sold"
  const [sale, setSale] = useState({
    date: new Date().toISOString().split("T")[0],
    buyer_type: "private",
    buyer_name: "",
    price_kr: "",
    vat: "excl" as "excl" | "incl",
  });

  // Slagtedata — vises når status = "slaughtered"
  const [slaughter, setSlaughter] = useState({
    date: new Date().toISOString().split("T")[0],
    weight_kg: "",
    price_per_kg: "",
    vat: "excl" as "excl" | "incl",
  });

  useEffect(() => {
    async function fetchAnimal() {
      const { data } = await supabase.from("animals").select("*").eq("id", id).single();
      if (data) {
        setForm({
          ear_tag: data.ear_tag ?? "",
          name: data.name ?? "",
          species: data.species ?? "sheep",
          breed: data.breed ?? "",
          sex: data.sex ?? "female",
          birth_date: data.birth_date ?? "",
          notes: data.notes ?? "",
          status: data.status ?? "active",
        });
      }
      setFetching(false);
    }
    fetchAnimal();
  }, [id]);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function setS(field: string, value: string) {
    setSlaughter(s => ({ ...s, [field]: value }));
  }

  function setSa(field: string, value: string) {
    setSale(s => ({ ...s, [field]: value }));
  }

  // Slagteberegninger
  const weightKg = parseFloat(slaughter.weight_kg) || 0;
  const pricePerKg = parseFloat(slaughter.price_per_kg) || 0;
  const slaughterTotalExcl = weightKg > 0 && pricePerKg > 0
    ? slaughter.vat === "incl" ? (weightKg * pricePerKg) / 1.25 : weightKg * pricePerKg
    : null;
  const slaughterTotalIncl = slaughterTotalExcl !== null ? slaughterTotalExcl * 1.25 : null;

  // Salgsberegninger
  const salePrice = parseFloat(sale.price_kr) || 0;
  const saleTotalExcl = salePrice > 0
    ? sale.vat === "incl" ? salePrice / 1.25 : salePrice
    : null;
  const saleTotalIncl = saleTotalExcl !== null ? saleTotalExcl * 1.25 : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.from("animals").update({
      ear_tag: form.ear_tag,
      name: form.name || null,
      species: form.species,
      breed: form.breed || null,
      sex: form.sex,
      birth_date: form.birth_date || null,
      notes: form.notes || null,
      status: form.status,
    }).eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    const { data: animal } = await supabase
      .from("animals").select("farm_id").eq("id", id).single();

    if (animal) {
      // Salg-hændelse
      if (form.status === "sold" && (sale.price_kr || sale.buyer_name || sale.buyer_type)) {
        const eventData: Record<string, string | number> = {
          buyer_type: sale.buyer_type,
        };
        if (sale.buyer_name) eventData.buyer_name = sale.buyer_name;
        if (salePrice > 0) {
          eventData.price_kr = salePrice;
          eventData.price_vat = sale.vat;
        }
        if (saleTotalExcl) eventData.total_excl_kr = Math.round(saleTotalExcl);
        if (saleTotalIncl) eventData.total_incl_kr = Math.round(saleTotalIncl);

        await supabase.from("animal_events").insert({
          animal_id: id,
          farm_id: animal.farm_id,
          event_type: "sale",
          event_date: sale.date,
          data: eventData,
          notes: null,
        });
      }

      // Slagte-hændelse
      if (form.status === "slaughtered" && (slaughter.weight_kg || slaughter.price_per_kg)) {
        const eventData: Record<string, string | number> = {};
        if (weightKg > 0) eventData.weight_kg = weightKg;
        if (pricePerKg > 0) {
          eventData.price_per_kg = pricePerKg;
          eventData.price_vat = slaughter.vat;
        }
        if (slaughterTotalExcl) eventData.total_excl_kr = Math.round(slaughterTotalExcl);
        if (slaughterTotalIncl) eventData.total_incl_kr = Math.round(slaughterTotalIncl);

        await supabase.from("animal_events").insert({
          animal_id: id,
          farm_id: animal.farm_id,
          event_type: "slaughtering",
          event_date: slaughter.date,
          data: eventData,
          notes: null,
        });
      }
    }

    router.push(`/animals/${id}`);
  }

  if (fetching) {
    return <div className="card text-center py-12 text-earth-400">Henter...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-earth-900">Rediger dyr</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-4">
          <div>
            <label className="label">Øremærkenummer *</label>
            <input className="input" value={form.ear_tag}
              onChange={e => set("ear_tag", e.target.value)}
              placeholder="fx DK 12345" required />
          </div>
          <div>
            <label className="label">Kaldenavn (valgfri)</label>
            <input className="input" value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="fx Bella" />
          </div>
          <div>
            <label className="label">Dyreart</label>
            <select className="input" value={form.species}
              onChange={e => set("species", e.target.value)}>
              <option value="sheep">Får</option>
              <option value="cattle">Kvæg</option>
              <option value="goats">Geder</option>
              <option value="chickens">Høns</option>
              <option value="pigs">Svin</option>
              <option value="other">Andet</option>
            </select>
          </div>
          <div>
            <label className="label">Race</label>
            <input className="input" value={form.breed}
              onChange={e => set("breed", e.target.value)}
              placeholder="fx Texel, Suffolk..." />
          </div>
          <div>
            <label className="label">Køn</label>
            <select className="input" value={form.sex}
              onChange={e => set("sex", e.target.value)}>
              <option value="female">Tæve / Får</option>
              <option value="male">Vædder / Han</option>
              <option value="castrated">Kastreret</option>
              <option value="unknown">Ukendt</option>
            </select>
          </div>
          <div>
            <label className="label">Fødselsdato</label>
            <input type="date" className="input" value={form.birth_date}
              onChange={e => set("birth_date", e.target.value)} />
          </div>
          <div>
            <label className="label">Noter</label>
            <textarea className="input" value={form.notes}
              onChange={e => set("notes", e.target.value)}
              rows={3} placeholder="Eventuelle bemærkninger..." />
          </div>
        </div>

        {/* Status */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-earth-800 text-sm">Status</h3>
          <select className="input" value={form.status}
            onChange={e => set("status", e.target.value)}>
            <option value="active">Aktiv</option>
            <option value="sold">Solgt</option>
            <option value="slaughtered">Slagtet</option>
            <option value="dead">Død</option>
          </select>
          {form.status !== "active" && (
            <p className="text-xs text-earth-500">
              Dyr med denne status vises ikke i den aktive besætning.
            </p>
          )}
        </div>

        {/* Salgsdata */}
        {form.status === "sold" && (
          <div className="card space-y-4 border border-sky-200 bg-sky-50">
            <div>
              <p className="font-semibold text-sky-900 text-sm">🤝 Salgsregistrering</p>
              <p className="text-xs text-sky-700 mt-0.5">Bruges til regnskab og analyse af salgskanaler.</p>
            </div>

            <div>
              <label className="label">Salgsdato</label>
              <input type="date" className="input" value={sale.date}
                onChange={e => setSa("date", e.target.value)} />
            </div>

            <div>
              <label className="label">Solgt til</label>
              <div className="grid grid-cols-3 gap-2">
                {BUYER_TYPES.map(bt => (
                  <button key={bt.value} type="button" onClick={() => setSa("buyer_type", bt.value)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-medium transition-colors ${
                      sale.buyer_type === bt.value
                        ? "border-sky-400 bg-sky-100 text-sky-800"
                        : "border-earth-200 text-earth-500"
                    }`}>
                    <span className="text-xl">{bt.icon}</span>
                    {bt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Købers navn (valgfri)</label>
              <input className="input" value={sale.buyer_name}
                onChange={e => setSa("buyer_name", e.target.value)}
                placeholder={
                  sale.buyer_type === "slaughterhouse" ? "fx Danish Crown, lokalt slagteri..." :
                  sale.buyer_type === "business" ? "fx navn på opkøber eller gård..." :
                  "fx Niels Hansen..."
                } />
            </div>

            <div>
              <label className="label">Salgspris (kr.)</label>
              <input type="number" className="input" value={sale.price_kr}
                onChange={e => setSa("price_kr", e.target.value)}
                placeholder="fx 1200" min="0" step="10" />
            </div>

            <div>
              <label className="label">Prisen er</label>
              <div className="grid grid-cols-2 gap-2">
                {([["excl", "Ex. moms"], ["incl", "Inkl. moms"]] as const).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setSa("vat", val)}
                    className={`py-2 rounded-xl border-2 text-sm font-medium transition-colors ${
                      sale.vat === val
                        ? "border-sky-400 bg-sky-100 text-sky-800"
                        : "border-earth-200 text-earth-500"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {saleTotalExcl !== null && saleTotalIncl !== null && (
              <div className="bg-white rounded-xl px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-earth-500">Ex. moms</p>
                  <p className="font-semibold text-earth-800">
                    {Math.round(saleTotalExcl).toLocaleString("da-DK")} kr.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-earth-100 pt-2">
                  <p className="text-sm text-earth-700 font-medium">Inkl. moms (25%)</p>
                  <p className="text-lg font-bold text-earth-900">
                    {Math.round(saleTotalIncl).toLocaleString("da-DK")} kr.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Slagtedata */}
        {form.status === "slaughtered" && (
          <div className="card space-y-4 border border-amber-200 bg-amber-50">
            <div>
              <p className="font-semibold text-amber-900 text-sm">🔪 Slagteregistrering</p>
              <p className="text-xs text-amber-700 mt-0.5">Udfyld hvad du ved — bruges til regnskab og statistik.</p>
            </div>

            <div>
              <label className="label">Slagtedato</label>
              <input type="date" className="input" value={slaughter.date}
                onChange={e => setS("date", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Slagtevægt (kg)</label>
                <input type="number" className="input" value={slaughter.weight_kg}
                  onChange={e => setS("weight_kg", e.target.value)}
                  placeholder="fx 22" min="0" step="0.1" />
              </div>
              <div>
                <label className="label">Pris pr. kg (kr.)</label>
                <input type="number" className="input" value={slaughter.price_per_kg}
                  onChange={e => setS("price_per_kg", e.target.value)}
                  placeholder="fx 45" min="0" step="0.5" />
              </div>
            </div>

            <div>
              <label className="label">Prisen er</label>
              <div className="grid grid-cols-2 gap-2">
                {([["excl", "Ex. moms"], ["incl", "Inkl. moms"]] as const).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setS("vat", val)}
                    className={`py-2 rounded-xl border-2 text-sm font-medium transition-colors ${
                      slaughter.vat === val
                        ? "border-amber-400 bg-amber-100 text-amber-800"
                        : "border-earth-200 text-earth-500"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {slaughterTotalExcl !== null && slaughterTotalIncl !== null && (
              <div className="bg-white rounded-xl px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-earth-500">Ex. moms</p>
                  <p className="font-semibold text-earth-800">
                    {Math.round(slaughterTotalExcl).toLocaleString("da-DK")} kr.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-earth-100 pt-2">
                  <p className="text-sm text-earth-700 font-medium">Inkl. moms (25%)</p>
                  <p className="text-lg font-bold text-earth-900">
                    {Math.round(slaughterTotalIncl).toLocaleString("da-DK")} kr.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
            Annuller
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? "Gemmer..." : "Gem ændringer"}
          </button>
        </div>
      </form>
    </div>
  );
}
