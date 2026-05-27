import { createClient } from "@/lib/supabase/server";
import AddObservationForm from "./AddObservationForm";
import { Bird, Bug, Sprout, PawPrint, Fish, Flower2, Eye, type LucideIcon } from "lucide-react";

const CATEGORIES: Record<string, { label: string; Icon: LucideIcon }> = {
  fugl:     { label: "Fugl",          Icon: Bird     },
  insekt:   { label: "Insekt",        Icon: Bug      },
  plante:   { label: "Plante",        Icon: Sprout   },
  pattedyr: { label: "Pattedyr",      Icon: PawPrint },
  padde:    { label: "Padde/Krybdyr", Icon: Fish     },
  svamp:    { label: "Svamp",         Icon: Flower2  },
  andet:    { label: "Andet",         Icon: Eye      },
};

const DA_MONTHS = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];

function shortDate(d: string) {
  const date = new Date(d);
  return `${date.getDate()}. ${DA_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export default async function BiodiversitetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: farm } = await supabase
    .from("farms").select("id, name").eq("user_id", user!.id).single();

  if (!farm) return null;

  const [
    { data: observations },
    { data: fields },
  ] = await Promise.all([
    supabase
      .from("biodiversity_observations")
      .select("*, field:fields(name)")
      .eq("farm_id", farm.id)
      .order("observed_at", { ascending: false })
      .limit(100),
    supabase
      .from("fields")
      .select("id, name")
      .eq("farm_id", farm.id)
      .order("name"),
  ]);

  // Opsummering
  const obs = observations ?? [];
  const totalCount = obs.length;
  const uniqueSpecies = new Set(obs.filter(o => o.species_name).map(o => o.species_name)).size;
  const thisYear = new Date().getFullYear();
  const thisYearCount = obs.filter(o => new Date(o.observed_at).getFullYear() === thisYear).length;

  // Fordeling per kategori
  const byCat: Record<string, number> = {};
  for (const o of obs) {
    byCat[o.category] = (byCat[o.category] ?? 0) + 1;
  }
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-earth-50">Biodiversitet</h1>
        <p className="text-earth-300 text-sm mt-0.5">
          Observationer af liv på {farm.name}
        </p>
      </div>

      {/* Opsummering */}
      {totalCount > 0 ? (
        <div className="card space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-earth-50">{totalCount}</p>
              <p className="text-xs text-earth-400 mt-0.5">observationer</p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-2xl font-bold text-earth-50">{uniqueSpecies}</p>
              <p className="text-xs text-earth-400 mt-0.5">registrerede arter</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-earth-50">{thisYearCount}</p>
              <p className="text-xs text-earth-400 mt-0.5">i {thisYear}</p>
            </div>
          </div>

          {topCats.length > 0 && (
            <div className="pt-3 border-t border-white/10 flex flex-wrap gap-2">
              {topCats.map(([cat, n]) => {
                const c = CATEGORIES[cat];
                const CatIcon = c?.Icon;
                return (
                  <span key={cat} className="flex items-center gap-1.5 text-xs bg-white/5 rounded-full px-2.5 py-1 text-earth-200">
                    {CatIcon && <CatIcon size={12} strokeWidth={1.5} />}
                    <span>{c?.label ?? cat}</span>
                    <span className="text-earth-400">{n}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-6">
          <Sprout size={32} strokeWidth={1} className="mx-auto mb-2 text-earth-500" />
          <p className="text-earth-300 text-sm">Ingen observationer endnu</p>
          <p className="text-earth-400 text-xs mt-1">
            Registrer hvad du ser — fugle, insekter, planter, svampe.<br />
            Over tid tegner det et billede af om gården bliver mere levende.
          </p>
        </div>
      )}

      {/* Observationsliste */}
      {obs.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-earth-100 mb-1">Seneste observationer</h3>
          <div>
            {obs.map((o) => {
              const cat = CATEGORIES[o.category];
              const CatIcon = cat?.Icon ?? Eye;
              const field = o.field as { name: string } | null;
              return (
                <div
                  key={o.id}
                  className="flex items-start gap-3 py-3 border-b last:border-0 -mx-4 px-4"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <CatIcon size={18} strokeWidth={1.5} className="flex-shrink-0 mt-0.5 text-earth-300" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-earth-100">
                      {o.species_name ?? cat?.label ?? o.category}
                      {o.count != null && (
                        <span className="font-normal text-earth-300"> · {o.count} stk</span>
                      )}
                    </p>
                    <p className="text-xs text-earth-400 mt-0.5">
                      {shortDate(o.observed_at)}
                      {field && <span> · {field.name}</span>}
                      {o.location_note && <span> · {o.location_note}</span>}
                    </p>
                    {o.notes && (
                      <p className="text-xs text-earth-400 mt-1 italic">{o.notes}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-earth-500 flex-shrink-0 mt-1 capitalize">
                    {cat?.label ?? o.category}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Formular */}
      <AddObservationForm
        farmId={farm.id}
        userId={user!.id}
        fields={(fields ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
