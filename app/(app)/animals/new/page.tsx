"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function NewAnimalPage() {
  const router = useRouter();
  const supabase = createClient();
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
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: farm } = await supabase
      .from("farms")
      .select("id")
      .eq("user_id", user!.id)
      .single();

    if (!farm) {
      setError("Opret en gård i Indstillinger først");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("animals").insert({
      farm_id: farm.id,
      ear_tag: form.ear_tag,
      name: form.name || null,
      species: form.species,
      breed: form.breed || null,
      sex: form.sex,
      birth_date: form.birth_date || null,
      notes: form.notes || null,
      status: "active",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/animals");
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-earth-900">Nyt dyr</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-4">
          <div>
            <label className="label">Øremærkenummer *</label>
            <input
              className="input"
              value={form.ear_tag}
              onChange={(e) => set("ear_tag", e.target.value)}
              placeholder="fx DK 12345"
              required
            />
          </div>
          <div>
            <label className="label">Kaldenavn (valgfri)</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="fx Bella"
            />
          </div>
          <div>
            <label className="label">Dyreart</label>
            <select
              className="input"
              value={form.species}
              onChange={(e) => set("species", e.target.value)}
            >
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
            <input
              className="input"
              value={form.breed}
              onChange={(e) => set("breed", e.target.value)}
              placeholder="fx Texel, Suffolk..."
            />
          </div>
          <div>
            <label className="label">Køn</label>
            <select
              className="input"
              value={form.sex}
              onChange={(e) => set("sex", e.target.value)}
            >
              <option value="female">Tæve / Får</option>
              <option value="male">Vædder / Han</option>
              <option value="castrated">Kastreret</option>
              <option value="unknown">Ukendt</option>
            </select>
          </div>
          <div>
            <label className="label">Fødselsdato</label>
            <input
              type="date"
              className="input"
              value={form.birth_date}
              onChange={(e) => set("birth_date", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Noter</label>
            <textarea
              className="input"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Eventuelle bemærkninger..."
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary flex-1"
          >
            Annuller
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? "Gemmer..." : "Gem dyr"}
          </button>
        </div>
      </form>
    </div>
  );
}
