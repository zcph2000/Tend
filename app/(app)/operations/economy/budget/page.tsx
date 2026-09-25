import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Wallet, Rocket } from "lucide-react";
import NewBudgetForm from "./NewBudgetForm";
import NewProjectForm from "./projects/NewProjectForm";

function fmtShort(d: string) {
  const DA_MONTHS = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
  const date = new Date(d);
  return `${date.getDate()}. ${DA_MONTHS[date.getMonth()]}`;
}

const STATUS_LABEL: Record<string, string> = {
  planlagt: "Planlagt", "i gang": "I gang", afsluttet: "Afsluttet", skrottet: "Skrottet",
};

export default async function BudgetListPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode = "drift" } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  if (!farm) {
    return (
      <div className="card text-center py-8">
        <p className="text-earth-300 text-sm">Opret din gård i Indstillinger først</p>
      </div>
    );
  }

  const [{ data: departments }, { data: budgets }, { data: lineCounts }, { data: projects }] = await Promise.all([
    supabase.from("departments").select("id, name").eq("farm_id", farm.id).order("name"),
    supabase
      .from("operating_budgets")
      .select("id, department_id, period_label, period_start, period_end")
      .eq("farm_id", farm.id)
      .order("period_start", { ascending: false }),
    supabase.from("budget_lines").select("operating_budget_id").eq("farm_id", farm.id).not("operating_budget_id", "is", null),
    supabase
      .from("budget_projects")
      .select("id, name, department_id, status, target_date")
      .eq("farm_id", farm.id)
      .order("created_at", { ascending: false }),
  ]);

  const deptNameById: Record<string, string> = {};
  for (const d of departments ?? []) deptNameById[d.id] = d.name;

  const lineCountByBudget: Record<string, number> = {};
  for (const l of lineCounts ?? []) {
    if (!l.operating_budget_id) continue;
    lineCountByBudget[l.operating_budget_id] = (lineCountByBudget[l.operating_budget_id] ?? 0) + 1;
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Link href="/operations/economy" className="text-earth-300">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-earth-50">Budget</h1>
          <p className="text-earth-300 text-sm mt-0.5">
            Skøn sammenholdt med det faktiske regnskab
          </p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--surface)" }}>
        {([
          { v: "drift", l: "Driftsbudget", Icon: Wallet },
          { v: "projekter", l: "Projekter", Icon: Rocket },
        ] as const).map(({ v, l, Icon }) => (
          <Link key={v} href={`/operations/economy/budget?mode=${v}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: mode === v ? "var(--surface-raised)" : "transparent",
              color: mode === v ? "var(--text-primary, #f5f0e8)" : "var(--text-muted)",
            }}>
            <Icon size={13} />
            {l}
          </Link>
        ))}
      </div>

      {mode === "drift" ? (
        <>
          {(budgets ?? []).length > 0 ? (
            <div className="space-y-3">
              {(budgets ?? []).map((b) => (
                <Link
                  key={b.id}
                  href={`/operations/economy/budget/${b.id}`}
                  className="card block hover:brightness-110 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-earth-50">
                        {b.department_id ? deptNameById[b.department_id] ?? "Ukendt afdeling" : "Hele gården"}
                      </h3>
                      <p className="text-xs text-earth-300 mt-1">
                        {b.period_label} · {fmtShort(b.period_start)}–{fmtShort(b.period_end)}
                      </p>
                      <p className="text-xs text-earth-500 mt-1">
                        {lineCountByBudget[b.id] ?? 0} {lineCountByBudget[b.id] === 1 ? "linje" : "linjer"}
                      </p>
                    </div>
                    <span className="text-earth-200 text-lg flex-shrink-0">→</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card text-center py-8">
              <div className="flex justify-center mb-3"><Wallet size={36} className="text-earth-400" /></div>
              <p className="text-earth-300 font-medium">Intet driftsbudget endnu</p>
              <p className="text-earth-200 text-sm mt-1">Opret et for en afdeling eller hele gården nedenfor</p>
            </div>
          )}

          <NewBudgetForm farmId={farm.id} departments={departments ?? []} />
        </>
      ) : (
        <>
          {(projects ?? []).length > 0 ? (
            <div className="space-y-3">
              {(projects ?? []).map((p) => (
                <Link
                  key={p.id}
                  href={`/operations/economy/budget/projects/${p.id}`}
                  className="card block hover:brightness-110 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-earth-50">{p.name}</h3>
                      <p className="text-xs text-earth-300 mt-1">
                        {p.department_id ? deptNameById[p.department_id] ?? "Ukendt afdeling" : "Hele gården"}
                        {" · "}{STATUS_LABEL[p.status] ?? p.status}
                        {p.target_date && <> · mål {fmtShort(p.target_date)}</>}
                      </p>
                    </div>
                    <span className="text-earth-200 text-lg flex-shrink-0">→</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card text-center py-8">
              <div className="flex justify-center mb-3"><Rocket size={36} className="text-earth-400" /></div>
              <p className="text-earth-300 font-medium">Intet projekt endnu</p>
              <p className="text-earth-200 text-sm mt-1">Opret et opstartsprojekt, fx en investering du overvejer</p>
            </div>
          )}

          <NewProjectForm farmId={farm.id} departments={departments ?? []} />
        </>
      )}
    </div>
  );
}
