"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Species } from "@/types";
import {
  SPECIES_LABELS, isBatchSpecies, INDIVIDUAL_PURPOSE_OPTIONS, BATCH_PURPOSE_OPTIONS,
} from "@/lib/animalTerms";

const SPECIES_ORDER: Species[] = ["sheep", "cattle", "goats", "chickens", "pigs", "other"];

export default function NewAnimalPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [species, setSpecies] = useState<Species | null>(null);
  const isBatch = species ? isBatchSpecies(species) : false;

  // Individdyr-felter
  const [form, setForm] = useState({
    ear_tag: "",
    name: "",
    breed: "",
    sex: "female",
    birth_date: "",
    purpose: "",
    notes: "",
  });

  // Flokdyr-felter
  const [batch, setBatch] = useState({
    name: "",
    head_count_female: "",
    head_count_male: "",
    breed: "",
    purpose: "æg",
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setBatchField(field: string, value: string) {
    setBatch((b) => ({ ...b, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!species) return;
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

    const payload = isBatch
      ? {
          farm_id: farm.id,
          species,
          is_batch: true,
          name: batch.name || SPECIES_LABELS[species],
          ear_tag: null,
          sex: null,
          breed: batch.breed || null,
          head_count_female: batch.head_count_female ? Number(batch.head_count_female) : null,
          head_count_male: batch.head_count_male ? Number(batch.head_count_male) : null,
          purpose: batch.purpose || null,
          notes: batch.notes || null,
          status: "active",
        }
      : {
          farm_id: farm.id,
          species,
          is_batch: false,
          ear_tag: form.ear_tag,
          name: form.name || null,
          breed: form.breed || null,
          sex: form.sex,
          birth_date: form.birth_date || null,
          purpose: form.purpose || null,
          notes: form.notes || null,
          status: "active",
        };

    const { error: insertError } = await supabase.from("animals").insert(payload as Record<string, unknown>);

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else {
      router.push("/animals");
    }
  }

  // ── TRIN 1: Vælg art ────────────────────────────────────────────────
  if (!species) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-earth-50">Nyt dyr</h2>
        <p className="text-sm text-earth-300">Hvilken art drejer det sig om?</p>
        <div className="grid grid-cols-2 gap-3">
          {SPECIES_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpecies(s)}
              className="card text-left py-4 hover:brightness-110 transition-all"
            >
              <p className="font-semibold text-earth-50">{SPECIES_LABELS[s]}</p>
              {isBatchSpecies(s) && (
                <p className="text-[11px] text-earth-400 mt-0.5">Registreres som flok med antal</p>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── TRIN 2: Flokdyr-formular (høns m.fl.) ──────────────────────────
  if (isBatch) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSpecies(null)} className="text-sm text-earth-300">
          ← Skift art
        </button>
        <h2 className="text-xl font-bold text-earth-50">Nyt hønsehold</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card space-y-4">
            <div>
              <label className="label">Navn på holdet</label>
              <input
                className="input"
                value={batch.name}
                onChange={(e) => setBatchField("name", e.target.value)}
                placeholder="fx Hønsehold 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Antal høner</label>
                <input
                  type="number" min="0" className="input"
                  value={batch.head_count_female}
                  onChange={(e) => setBatchField("head_count_female", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Antal haner</label>
                <input
                  type="number" min="0" className="input"
                  value={batch.head_count_male}
                  onChange={(e) => setBatchField("head_count_male", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="label">Race</label>
              <input
                className="input"
                value={batch.breed}
                onChange={(e) => setBatchField("breed", e.target.value)}
                placeholder="fx Hvid Leghorn"
              />
            </div>
            <div>
              <label className="label">Formål</label>
              <select
                className="input"
                value={batch.purpose}
                onChange={(e) => setBatchField("purpose", e.target.value)}
              >
                {BATCH_PURPOSE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Noter</label>
              <textarea
                className="input"
                value={batch.notes}
                onChange={(e) => setBatchField("notes", e.target.value)}
                rows={3}
                placeholder="Eventuelle bemærkninger..."
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
              Annuller
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Gemmer..." : "Gem hønsehold"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── TRIN 2: Individdyr-formular ────────────────────────────────────
  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setSpecies(null)} className="text-sm text-earth-300">
        ← Skift art
      </button>
      <h2 className="text-xl font-bold text-earth-50">Nyt dyr — {SPECIES_LABELS[species]}</h2>

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
              <option value="female">Hun</option>
              <option value="male">Han</option>
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
            <label className="label">Formål</label>
            <select className="input" value={form.purpose} onChange={(e) => set("purpose", e.target.value)}>
              <option value="">— Ikke angivet —</option>
              {INDIVIDUAL_PURPOSE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
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
