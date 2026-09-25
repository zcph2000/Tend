import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import NewBudgetForm from "./NewBudgetForm";

function fmtShort(d: string) {
  const DA_MONTHS = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
  const date = new Date(d);
  return `${date.getDate()}. ${DA_MONTHS[date.getMonth()]}`;
}

export default async function BudgetListPage() {
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

  const [{ data: departments }, { data: budgets }, { data: lineCounts }] = await Promise.all([
    supabase.from("departments").select("id, name").eq("farm_id", farm.id).order("name"),
    supabase
      .from("operating_budgets")
      .select("id, department_id, period_label, period_start, period_end")
      .eq("farm_id", farm.id)
      .order("period_start", { ascending: false }),
    supabase.from("budget_lines").select("operating_budget_id").eq("farm_id", farm.id).not("operating_budget_id", "is", null),
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
          <h1 className="text-2xl font-bold text-earth-50">Driftsbudget</h1>
          <p className="text-earth-300 text-sm mt-0.5">
            Skøn pr. afdeling eller hele gården, sammenholdt med det faktiske regnskab
          </p>
        </div>
      </div>

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
    </div>
  );
}
