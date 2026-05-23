"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ChevronRight, Leaf, SlidersHorizontal, X, Wind } from "lucide-react";

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
    scientific_name: string | null;
    plant_type: string;
    crop_families: { name_da: string; scientific_name: string } | null;
  } | null;
};

const MONTHS = ["","Jan","Feb","Mar","Apr","Maj","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

const TYPE_LABELS: Record<string, string> = {
  grøntsag: "Grøntsag", urt: "Urt", frugt: "Frugt", bær: "Bær",
  nød: "Nød", dækafgrøde: "Dækafgrøde", blomst: "Blomst", løg: "Løg", rod: "Rod",
};

const PLANT_TYPE_LABELS: Record<string, string> = {
  etårig: "Etårig", toårig: "Toårig", flerårig: "Flerårig", vedplante: "Vedplante",
};

function harvestLabel(from: number | null, to: number | null) {
  if (!from) return null;
  if (from === to) return MONTHS[from];
  return `${MONTHS[from]}–${MONTHS[to ?? 12]}`;
}

type Group = {
  speciesName: string;
  scientificName: string | null;
  plantType: string;
  familyName: string | null;
  familyScientific: string | null;
  varieties: Variety[];
};

export default function AfgrodeList({ varieties }: { varieties: Variety[] }) {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterPlantType, setFilterPlantType] = useState<string>("");
  const [filterHeritage, setFilterHeritage] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);

  // Filtrer sorter
  const filtered = useMemo(() => {
    return varieties.filter((v) => {
      const q = query.toLowerCase().trim();
      if (q) {
        const nameMatch      = v.name.toLowerCase().includes(q);
        const speciesMatch   = v.crop_species?.name_da.toLowerCase().includes(q) ?? false;
        const sciMatch       = v.crop_species?.scientific_name?.toLowerCase().includes(q) ?? false;
        const familyMatch    = v.crop_species?.crop_families?.name_da.toLowerCase().includes(q) ?? false;
        if (!nameMatch && !speciesMatch && !sciMatch && !familyMatch) return false;
      }
      if (filterType && v.variety_type !== filterType) return false;
      if (filterPlantType && v.crop_species?.plant_type !== filterPlantType) return false;
      if (filterHeritage && !v.heritage) return false;
      return true;
    });
  }, [varieties, query, filterType, filterPlantType, filterHeritage]);

  // Gruppér efter art
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const v of filtered) {
      const key = v.crop_species?.name_da ?? "Ukendt";
      if (!map.has(key)) {
        map.set(key, {
          speciesName:      key,
          scientificName:   v.crop_species?.scientific_name ?? null,
          plantType:        v.crop_species?.plant_type ?? "",
          familyName:       v.crop_species?.crop_families?.name_da ?? null,
          familyScientific: v.crop_species?.crop_families?.scientific_name ?? null,
          varieties:        [],
        });
      }
      map.get(key)!.varieties.push(v);
    }
    return [...map.values()].sort((a, b) =>
      a.speciesName.localeCompare(b.speciesName, "da")
    );
  }, [filtered]);

  const activeFilters = [filterType, filterPlantType, filterHeritage ? "h" : ""].filter(Boolean).length;
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
            placeholder="Søg art eller sort…"
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
          <div>
            <p className="text-xs font-medium text-earth-400 mb-2 uppercase tracking-wider">Kategori</p>
            <div className="flex flex-wrap gap-1.5">
              {uniqueTypes.map((t) => (
                <button key={t}
                  onClick={() => setFilterType(filterType === t ? "" : t)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: filterType === t ? "var(--clay)" : "var(--surface-raised)",
                    color: filterType === t ? "#fff" : "var(--text-muted)",
                  }}>
                  {TYPE_LABELS[t] ?? t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-earth-400 mb-2 uppercase tracking-wider">Levetid</p>
            <div className="flex flex-wrap gap-1.5">
              {uniquePlantTypes.map((t) => (
                <button key={t}
                  onClick={() => setFilterPlantType(filterPlantType === t ? "" : t)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: filterPlantType === t ? "var(--clay)" : "var(--surface-raised)",
                    color: filterPlantType === t ? "#fff" : "var(--text-muted)",
                  }}>
                  {PLANT_TYPE_LABELS[t] ?? t}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setFilterHeritage(!filterHeritage)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: filterHeritage ? "rgba(34,197,94,0.15)" : "var(--surface-raised)",
              color: filterHeritage ? "var(--grass)" : "var(--text-muted)",
              border: filterHeritage ? "1px solid rgba(34,197,94,0.3)" : "1px solid transparent",
            }}>
            <Leaf size={14} />
            Kun heritage-sorter
          </button>
          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterType(""); setFilterPlantType(""); setFilterHeritage(false); }}
              className="flex items-center gap-1.5 text-xs text-earth-400 hover:text-earth-200 transition-colors">
              <X size={12} />Nulstil filtre
            </button>
          )}
        </div>
      )}

      {/* Antal */}
      <p className="text-xs text-earth-400">
        {filtered.length} {filtered.length === 1 ? "sort" : "sorter"} · {groups.length} {groups.length === 1 ? "art" : "arter"}
        {varieties.length !== filtered.length && ` (af ${varieties.length} sorter)`}
      </p>

      {/* Grupperet liste */}
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.speciesName}>
            {/* Artsheader */}
            <div className="flex items-baseline gap-2 mb-2 px-1">
              <h2 className="font-bold text-earth-100 text-base">{group.speciesName}</h2>
              {group.scientificName && (
                <em className="text-xs text-earth-500 hidden sm:inline">{group.scientificName}</em>
              )}
              {group.familyName && (
                <button
                  onClick={() =>
                    setExpandedFamily(expandedFamily === group.speciesName ? null : group.speciesName)
                  }
                  className="text-[10px] px-1.5 py-0.5 rounded transition-colors ml-auto flex-shrink-0"
                  style={{
                    background: expandedFamily === group.speciesName
                      ? "rgba(255,255,255,0.1)"
                      : "var(--surface-raised)",
                    color: "var(--text-subtle)",
                  }}
                >
                  {group.familyName}
                </button>
              )}
            </div>

            {/* Familie-info (expanderet) */}
            {expandedFamily === group.speciesName && group.familyName && (
              <div
                className="mb-2 mx-1 px-3 py-2 rounded-lg text-xs text-earth-300 leading-relaxed"
                style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="font-medium text-earth-200">{group.familyName}</span>
                {group.familyScientific && (
                  <em className="text-earth-500"> ({group.familyScientific})</em>
                )}
              </div>
            )}

            {/* Sorter under arten */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              {group.varieties.map((v, i) => {
                const harvest = harvestLabel(v.harvest_from_month, v.harvest_to_month);
                const isLast = i === group.varieties.length - 1;
                return (
                  <Link
                    key={v.id}
                    href={`/jordbrug/afgroder/${v.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:brightness-110 transition-all group"
                    style={{
                      background: "var(--surface)",
                      borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-earth-100 text-sm">{v.name}</span>
                        {v.heritage && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1"
                            style={{ background: "rgba(34,197,94,0.15)", color: "var(--grass)" }}
                          >
                            <Leaf size={9} />
                            Heritage
                          </span>
                        )}
                        {v.polytunnel_benefit === "krævet" && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1"
                            style={{ background: "rgba(251,191,36,0.12)", color: "#d97706" }}
                          >
                            <Wind size={9} />
                            Tunnel
                          </span>
                        )}
                      </div>
                      {harvest && (
                        <p className="text-[11px] text-earth-500 mt-0.5">Høst {harvest}</p>
                      )}
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-earth-500 group-hover:text-earth-300 flex-shrink-0 transition-colors"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="text-center py-12 text-earth-400 text-sm">
            Ingen sorter matcher søgningen
          </div>
        )}
      </div>
    </div>
  );
}
