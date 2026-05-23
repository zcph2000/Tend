"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Farm } from "@/types";
import { MapPin, Check } from "lucide-react";

export default function FarmSettingsForm({
  farm,
  userId,
}: {
  farm: Farm | null;
  userId: string;
}) {
  const [name, setName] = useState(farm?.name ?? "");
  const [location, setLocation] = useState(farm?.location ?? "");
  const [lat, setLat] = useState(farm?.lat?.toString() ?? "");
  const [lng, setLng] = useState(farm?.lng?.toString() ?? "");
  const [profile, setProfile] = useState(farm?.profile ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const data = {
      user_id: userId,
      name,
      location: location || null,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      profile: profile || null,
    };

    if (farm) {
      await supabase.from("farms").update(data).eq("id", farm.id);
    } else {
      await supabase.from("farms").insert(data);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setLoading(false);
    router.refresh();
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
    });
  }

  return (
    <form onSubmit={handleSave} className="card space-y-4">
      <h3 className="font-semibold text-earth-50">
        {farm ? "Gårdsindstillinger" : "Opret din gård"}
      </h3>

      <div>
        <label className="label">Gårdens navn *</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="fx Røsnæsgård"
          required
        />
      </div>

      <div>
        <label className="label">Adresse / sted</label>
        <input
          className="input"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="fx Røsnæs, Danmark"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">GPS-koordinater</label>
          <button
            type="button"
            onClick={useCurrentLocation}
            className="flex items-center gap-1 text-xs text-grass-500 font-medium"
          >
            <MapPin size={12} />
            Brug min position
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="0.000001"
            className="input"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="Breddegrad (55.75)"
          />
          <input
            type="number"
            step="0.000001"
            className="input"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="Længdegrad (11.0)"
          />
        </div>
        <p className="text-xs text-earth-200 mt-1">
          Bruges til præcis vejrudsigt for din lokation
        </p>
      </div>

      <div>
        <label className="label">Gårdsprofil til AI-rådgiver</label>
        <textarea
          className="input"
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          rows={4}
          placeholder="Beskriv din gård, dine mål og din driftsfilosofi. Fx: 'Vi driver regenerativt landbrug på Røsnæs med fokus på naturpleje og holistic management. Vi har to marker med EU-naturplejeaftale hvor der ikke må sås. Avlsmålet er robuste moderdyr...'"
        />
        <p className="text-xs text-earth-200 mt-1">
          Bruges af AI-rådgiveren til at give dig mere præcise anbefalinger.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !name}
        className="btn-primary w-full"
      >
        {loading ? "Gemmer..." : saved ? <span className="flex items-center justify-center gap-1"><Check size={14} /> Gemt!</span> : farm ? "Gem ændringer" : "Opret gård"}
      </button>
    </form>
  );
}
