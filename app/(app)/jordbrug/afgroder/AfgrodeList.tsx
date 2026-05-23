"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ChevronRight, Leaf, SlidersHorizontal, X } from "lucide-react";

type Variety = {
  id: string;
  name: string;
  heritage: boolean;
  variety_type: string | null;
  description: string | null;
  direct_sow: boolean;
  indoor_propagation: boolean;
  harvest_from_month: number | null;
  harvest_to_month: number | null;
  sun_requirements: string | null;
  frost_hardy: boolean;
  polytunnel_benefit: string | null;
  crop_species: {
    name_da: string;
    plant_type: string;
    crop_families: { name_da: string } | null;
  } | null;
};

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

const TYPE_LABELS: Record<string, string> = {
  grøntsag: "Grøntsag",
  urt: "Urt",
  frugt: "Frugt",
  bær: "Bær",
  nød: "Nød",
  dækafgrøde: "Dækafgrøde",
  blomst: "Blomst",
  løg: "Løg",
  rod: "Rod",
};

const PLANT_TYPE_LABELS: Record<string, string> = {
  etårig: "Etårig",
  toårig: "Toårig",
  flerårig: "Flerårig",
  vedplante: "Vedplante",
};

function harvestLabel(from: number | null, to: number | null) {
  if (!from && !to) return null;
  if (from && to && from === to) return MONTHS[from];
  if (from && to) return `${MONTHS[from]}–${MONTHS[to]}`;
  return null;
}

function PropMethod({ direct, indoor }: { direct: boolean; indoor: boolean }) {
  if (direct && indoor) return <span className="text-[10px] text-earth-400">Forspiring + direkte</span>;
  if (indoor) return <span className="text-[10px] text-earth-400">Forspires</span>;
  if (direct) return <span className="text-[10px] text-earth-400">Direkte såning</span>;
  return <span className="text-[10px] text-earth-400">Plantes</span>;
}

export default function AfgrodeList({ varieties }: { varieties: Variety[] }) {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterPlantType, setFilterPlantType] = useState<string>("");
  const [filterHeritage, setFilterHeritage] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return varieties.filter((v) => {
      const q = query.toLowerCase();
      if (q) {
        const nameMatch = v.name.toLowerCase().includes(q);
        const speciesMatch = v.crop_species?.name_da.toLowerCase().includes(q) ?? false;
        const familyMatch = v.crop_species?.crop_families?.name_da.toLowerCase().includes(q) ?? false;
        if (!nameMatch && !speciesMatch && !familyMatch) return false;
      }
      if (filterType && v.variety_type !== filterType) return false;
      if (filterPlantType && v.crop_species?.plant_type !== filterPlantType) return false;
      if (filterHeritage && !v.heritage) return false;
      return true;
    });
  }, [varieties, query, filterType, filterPlantType, filterHeritage]);

  const activeFilters = [filterType, filterPlantType, filterHeritage ? "heritage" : ""].filter(Boolean).length;

  const uniqueTypes = [...new Set(varieties.map((v) => v.variety_type).filter(Boolean))].sort() as string[];
  const uniquePlantTypes = [...new Set(varieties.map((v) => v.crop_species?.plant_type).filter(Boolean))].sort() as string[];

  return (
    <div className="space-y-4">
      {/* Søgning */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-400" />
          <input
            type="text"
            placeholder="Søg sort, art eller familie…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input w-full pl-9 text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: showFilters ? "var(--surface-raised)" : "var(--surface)",
            color: "var(--text-muted)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <SlidersHorizontal size={15} />
          <span className="hidden sm:inline">Filter</span>
          {activeFilters > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: "var(--clay)", color: "#fff" }}
            >
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Filterpanel */}
      {showFilters && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Type */}
          <div>
            <p className="text-xs font-medium text-earth-400 mb-2 uppercase tracking-wider">Kategori</p>
            <div className="flex flex-wrap gap-1.5">
              {uniqueTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(filterType === t ? "" : t)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: filterType === t ? "var(--clay)" : "var(--surface-raised)",
                    color: filterType === t ? "#fff" : "var(--text-muted)",
                  }}
                >
                  {TYPE_LABELS[t] ?? t}
                </button>
              ))}
            </div>
          </div>

          {/* Plantetype */}
          <div>
            <p className="text-xs font-medium text-earth-400 mb-2 uppercase tracking-wider">Levetid</p>
            <div className="flex flex-wrap gap-1.5">
              {uniquePlantTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterPlantType(filterPlantType === t ? "" : t)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: filterPlantType === t ? "var(--clay)" : "var(--surface-raised)",
                    color: filterPlantType === t ? "#fff" : "var(--text-muted)",
                  }}
                >
                  {PLANT_TYPE_LABELS[t] ?? t}
                </button>
              ))}
            </div>
          </div>

          {/* Heritage */}
          <button
            onClick={() => setFilterHeritage(!filterHeritage)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: filterHeritage ? "rgba(34,197,94,0.15)" : "var(--surface-raised)",
              color: filterHeritage ? "var(--grass)" : "var(--text-muted)",
              border: filterHeritage ? "1px solid rgba(34,197,94,0.3)" : "1px solid transparent",
            }}
          >
            <Leaf size={14} />
            Kun heritage-sorter
          </button>

          {/* Nulstil */}
          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterType(""); setFilterPlantType(""); setFilterHeritage(false); }}
              className="flex items-center gap-1.5 text-xs text-earth-400 hover:text-earth-200 transition-colors"
            >
              <X size={12} />
              Nulstil filtre
            </button>
          )}
        </div>
      )}

      {/* Resultattal */}
      <p className="text-xs text-earth-400">
        {filtered.length} {filtered.length === 1 ? "sort" : "sorter"}
        {varieties.length !== filtered.length && ` af ${varieties.length}`}
      </p>

      {/* Liste */}
      <div className="space-y-2">
        {filtered.map((v) => {
          const harvest = harvestLabel(v.harvest_from_month, v.harvest_to_month);
          return (
            <Link
              key={v.id}
              href={`/jordbrug/afgroder/${v.id}`}
              className="card flex items-start gap-3 hover:brightness-110 transition-all group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-earth-50">{v.name}</span>
                  {v.heritage && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1"
                      style={{ background: "rgba(34,197,94,0.15)", color: "var(--grass)" }}
                    >
                      <Leaf size={9} />
                      Heritage
                    </span>
                  )}
                  {v.variety_type && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ background: "var(--surface-raised)", color: "var(--text-subtle)" }}
                    >
                      {TYPE_LABELS[v.variety_type] ?? v.variety_type}
                    </span>
                  )}
                </div>
                <p className="text-sm text-earth-400 mt-0.5">
                  {v.crop_species?.name_da}
                  {v.crop_species?.crop_families?.name_da && (
                    <span className="text-earth-500"> · {v.crop_species.crop_families.name_da}</span>
                  )}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <PropMethod direct={v.direct_sow} indoor={v.indoor_propagation} />
                  {harvest && (
                    <span className="text-[10px] text-earth-400">Høst {harvest}</span>
                  )}
                  {v.polytunnel_benefit === "krævet" && (
                    <span className="text-[10px] text-earth-400">Polytunnel krævet</span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-earth-400 group-hover:text-earth-200 flex-shrink-0 mt-1 transition-colors" />
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-earth-400 text-sm">
            Ingen sorter matcher søgningen
          </div>
        )}
      </div>
    </div>
  );
}
