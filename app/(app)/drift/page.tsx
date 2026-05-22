import { createClient } from "@/lib/supabase/server";
import { daysSince, getGrazingRecommendation } from "@/lib/utils";
import Link from "next/link";

const DA_DAYS   = ["Søndag","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag"];
const DA_MONTHS = ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december"];

function formatDate(d: Date) {
  return `${DA_DAYS[d.getDay()]} ${d.getDate()}. ${DA_MONTHS[d.getMonth()]}`;
}

export default async function DriftPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: farm } = await supabase
    .from("farms").select("id").eq("user_id", user!.id).single();

  if (!farm) {
    return (
      <div className="card text-center py-8">
        <p className="text-earth-500 text-sm">Opret din gård i Indstillinger først</p>
      </div>
    );
  }

  const [
    { data: activeGrazing },
    { data: flockAnimals },
    { data: fields },
    { data: sections },
  ] = await Promise.all([
    supabase
      .from("grazing_records")
      .select("id, start_date, flock_id, flock:flocks(id,name), section:sections(id,name,area_ha)")
      .eq("farm_id", farm.id)
      .is("end_date", null)
      .order("start_date"),
    supabase
      .from("animals")
      .select("flock_id")
      .eq("farm_id", farm.id)
      .eq("status", "active")
      .not("flock_id", "is", null),
    supabase.from("fields").select("id").eq("farm_id", farm.id),
    supabase.from("sections").select("id").eq("farm_id", farm.id),
  ]);

  const animalCountByFlock = (flockAnimals ?? []).reduce<Record<string, number>>((acc, a) => {
    if (a.flock_id) acc[a.flock_id] = (acc[a.flock_id] ?? 0) + 1;
    return acc;
  }, {});

  const month = new Date().getMonth() + 1;

  // Auto-genererede opgaver fra data
  type Task = { id: string; icon: string; label: string; sub: string; urgent: boolean; href: string };
  const tasks: Task[] = [];

  for (const record of activeGrazing ?? []) {
    const flock = record.flock as unknown as { id: string; name: string } | null;
    const section = record.section as unknown as { id: string; name: string; area_ha: number } | null;
    if (!flock || !section) continue;

    const animalCount = animalCountByFlock[flock.id] ?? 0;
    const daysGrazing = daysSince(record.start_date);
    const rec = getGrazingRecommendation(section.area_ha, animalCount, daysGrazing, month);

    if (rec.shouldMove) {
      tasks.push({
        id: record.id,
        icon: "🔄",
        label: `Flyt ${flock.name}`,
        sub: `${daysGrazing} dage på "${section.name}" — tid til næste sektion`,
        urgent: true,
        href: "/rotation",
      });
    }
  }

  // Statusbeskeder til area-kortene
  const flockStatuses = activeGrazing ?? [];
  const activeFlockCount = flockStatuses.length;
  const totalFlockCount = (flockAnimals?.length ?? 0) > 0 ? activeFlockCount : 0; // simplified

  return (
    <div className="space-y-4">

      {/* ── Dagens gøremål ── */}
      <div className="card border-2 border-amber-200 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-earth-900">Dagens gøremål</h2>
          <span className="text-xs text-earth-400">{formatDate(new Date())}</span>
        </div>

        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map(task => (
              <Link key={task.id} href={task.href}
                className="flex items-start gap-3 bg-amber-50 rounded-xl p-3 hover:bg-amber-100 transition-colors">
                <span className="text-lg flex-shrink-0 mt-0.5">{task.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-earth-900">{task.label}</p>
                  <p className="text-xs text-earth-500 mt-0.5 leading-snug">{task.sub}</p>
                </div>
                {task.urgent && (
                  <span className="text-[10px] font-semibold bg-red-100 text-red-600 rounded-full px-2 py-0.5 flex-shrink-0 mt-0.5">
                    Nu
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-grass-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-xl">✓</span>
            <p className="text-sm text-grass-700 font-medium">Alt ser godt ud i dag</p>
          </div>
        )}

        <Link href="/drift/kalender"
          className="flex items-center justify-center gap-1.5 text-xs text-earth-400 hover:text-earth-600 transition-colors pt-1">
          <span>📅</span>
          <span>Se kalender med alle gøremål</span>
          <span>→</span>
        </Link>
      </div>

      {/* ── Driftsområder ── */}
      <div>
        <p className="text-xs font-semibold text-earth-400 uppercase tracking-wide px-1 mb-2">
          Hvad skal der passes?
        </p>
        <div className="space-y-3">
          {[
            {
              href: "/rotation",
              icon: "🐑",
              label: "Dyr & flokke",
              description: "Se aktuel placering, flyt flokke og følg genopretning.",
              status: activeFlockCount > 0
                ? `${activeFlockCount} flok${activeFlockCount !== 1 ? "ke" : ""} i rotation`
                : "Ingen flokke i rotation",
              ready: true,
            },
            {
              href: "/pastures",
              icon: "🌿",
              label: "Marker",
              description: "Afgræsningsstatus, sektioner og hegnsopsætning.",
              status: fields?.length
                ? `${fields.length} mark${fields.length !== 1 ? "er" : ""} · ${sections?.length ?? 0} sektioner`
                : "Ingen marker oprettet",
              ready: true,
            },
            {
              href: "#",
              icon: "🥕",
              label: "Market garden",
              description: "Bede, såplan, vanding og høstlog.",
              status: null,
              ready: false,
            },
          ].map((area) =>
            area.ready ? (
              <Link key={area.label} href={area.href}
                className="card flex items-start gap-4 hover:shadow-md transition-shadow group">
                <span className="text-3xl mt-0.5 flex-shrink-0">{area.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-earth-900">{area.label}</p>
                    {area.status && (
                      <span className="text-[10px] font-medium bg-earth-100 text-earth-500 rounded-full px-2 py-0.5">
                        {area.status}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-earth-400 mt-0.5 leading-snug">{area.description}</p>
                </div>
                <span className="text-earth-300 text-lg group-hover:text-earth-500 transition-colors flex-shrink-0 mt-1">→</span>
              </Link>
            ) : (
              <div key={area.label} className="card flex items-start gap-4 opacity-50 cursor-default">
                <span className="text-3xl mt-0.5 flex-shrink-0 grayscale">{area.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-earth-700">{area.label}</p>
                    <span className="text-[10px] font-medium bg-earth-100 text-earth-400 rounded-full px-2 py-0.5">
                      Kommer snart
                    </span>
                  </div>
                  <p className="text-sm text-earth-400 mt-0.5 leading-snug">{area.description}</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
