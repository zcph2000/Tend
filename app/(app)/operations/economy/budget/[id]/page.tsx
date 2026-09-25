import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buildDepartmentResolvers } from "@/lib/departmentAttribution";
import { TASK_TYPE_LABELS } from "@/lib/taskTimeEstimates";
import { EXPENSE_CATEGORIES } from "@/lib/expenseCategories";
import BudgetLineForm from "../BudgetLineForm";
import DeleteLineButton from "../DeleteLineButton";
import DeleteBudgetButton from "./DeleteBudgetButton";

const CATEGORY_LABEL = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.v, c.l]));

function fmtShort(d: string) {
  const DA_MONTHS = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
  const date = new Date(d);
  return `${date.getDate()}. ${DA_MONTHS[date.getMonth()]}`;
}
function kr(n: number) {
  return `${Math.round(n).toLocaleString("da-DK")} kr`;
}

export default async function BudgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id, default_hourly_rate_dkk").eq("user_id", user!.id).single();
  if (!farm) return notFound();

  const { data: budget } = await supabase
    .from("operating_budgets")
    .select("id, department_id, period_label, period_start, period_end")
    .eq("id", id)
    .eq("farm_id", farm.id)
    .single();
  if (!budget) return notFound();

  const [
    { data: department },
    { data: lines },
    { data: expenses },
    { data: harvestLogs },
    { data: animalLogs },
    { data: tasks },
    resolvers,
  ] = await Promise.all([
    budget.department_id
      ? supabase.from("departments").select("name").eq("id", budget.department_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("budget_lines").select("*").eq("operating_budget_id", id).order("created_at"),
    supabase.from("farm_expenses").select("category, amount_dkk, flock_id, department_id")
      .eq("farm_id", farm.id).gte("date", budget.period_start).lte("date", budget.period_end),
    supabase.from("harvest_logs").select("planting_id, quantity_kg, price_per_kg")
      .eq("farm_id", farm.id).gte("harvest_date", budget.period_start).lte("harvest_date", budget.period_end),
    supabase.from("animal_product_logs").select("flock_id, quantity, price_per_unit, sold_to_type")
      .eq("farm_id", farm.id).gte("log_date", budget.period_start).lte("log_date", budget.period_end),
    supabase.from("farm_tasks").select("task_type, actual_minutes, flock_id, bed_planting_id, done_at")
      .eq("farm_id", farm.id).eq("status", "done").not("actual_minutes", "is", null)
      .gte("done_at", budget.period_start).lte("done_at", budget.period_end),
    buildDepartmentResolvers(supabase, farm.id),
  ]);

  const hourlyRate = farm.default_hourly_rate_dkk ?? null;

  function matchesDept(rowDept: string | null): boolean {
    return budget!.department_id === null ? true : rowDept === budget!.department_id;
  }

  const salgTotal =
    (harvestLogs ?? [])
      .filter((l) => matchesDept(resolvers.deptForPlantingId(l.planting_id)))
      .reduce((s, l) => s + (l.quantity_kg ?? 0) * (l.price_per_kg ?? 0), 0) +
    (animalLogs ?? [])
      .filter((l) => l.sold_to_type !== "ikke_solgt" && matchesDept(resolvers.deptForFlockId(l.flock_id)))
      .reduce((s, l) => s + l.quantity * (l.price_per_unit ?? 0), 0);

  function actualExpenseForCategory(category: string): number {
    return (expenses ?? [])
      .filter((e) => e.category === category && e.amount_dkk < 0 && matchesDept(resolvers.deptForExpense(e)))
      .reduce((s, e) => s + Math.abs(e.amount_dkk), 0);
  }

  function actualMinutesForTaskType(taskType: string): number {
    return (tasks ?? [])
      .filter((t) => {
        const d = resolvers.deptForFlockId(t.flock_id) ?? resolvers.deptForPlantingId(t.bed_planting_id);
        return t.task_type === taskType && matchesDept(d);
      })
      .reduce((s, t) => s + (t.actual_minutes ?? 0), 0);
  }

  const rows = (lines ?? []).map((line) => {
    if (line.source === "udgift") {
      const actual = -actualExpenseForCategory(line.category!);
      return { line, estimated: line.estimated_amount_dkk ?? 0, actual, unit: "kr" as const };
    }
    if (line.source === "salg") {
      return { line, estimated: line.estimated_amount_dkk ?? 0, actual: salgTotal, unit: "kr" as const };
    }
    const actualMinutes = actualMinutesForTaskType(line.task_type!);
    return {
      line,
      estimated: line.estimated_hours ?? 0,
      actual: Math.round((actualMinutes / 60) * 10) / 10,
      unit: "timer" as const,
      actualMinutes,
    };
  });

  const moneyRows = rows.filter((r) => r.unit === "kr");
  const totalEstimatedMoney = moneyRows.reduce((s, r) => s + r.estimated, 0);
  // "Faktisk salg" er ét reelt tal, ikke additivt pr. salgslinje — tælles kun
  // med én gang selvom der er flere salgslinjer i budgettet.
  const totalActualExpense = moneyRows.filter((r) => r.line.source === "udgift").reduce((s, r) => s + r.actual, 0);
  const hasSalgLine = moneyRows.some((r) => r.line.source === "salg");
  const totalActualMoney = totalActualExpense + (hasSalgLine ? salgTotal : 0);

  const timeRows = rows.filter((r) => r.unit === "timer");
  const totalEstimatedHours = timeRows.reduce((s, r) => s + r.estimated, 0);
  const totalActualHours = timeRows.reduce((s, r) => s + r.actual, 0);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Link href="/operations/economy/budget" className="text-earth-300">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-earth-50">{department?.name ?? "Hele gården"}</h1>
          <p className="text-earth-300 text-sm mt-0.5">
            {budget.period_label} · {fmtShort(budget.period_start)}–{fmtShort(budget.period_end)}
          </p>
        </div>
      </div>

      {/* Totaler */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[10px] font-semibold text-earth-500 uppercase tracking-widest mb-1">Kroner</p>
          <p className="text-xs text-earth-400">Skøn: {kr(totalEstimatedMoney)}</p>
          <p className="text-sm font-bold" style={{ color: totalActualMoney >= totalEstimatedMoney ? "#a3e635" : "#f87171" }}>
            Faktisk: {kr(totalActualMoney)}
          </p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[10px] font-semibold text-earth-500 uppercase tracking-widest mb-1">Arbejdstid</p>
          <p className="text-xs text-earth-400">Skøn: {totalEstimatedHours}t</p>
          <p className="text-sm font-bold text-earth-100">
            Faktisk: {totalActualHours}t
            {hourlyRate && timeRows.length > 0 && <span className="text-earth-500 font-normal"> · {kr(totalActualHours * hourlyRate)}</span>}
          </p>
        </div>
      </div>

      {/* Linjer */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="px-4 py-3 text-sm font-semibold text-earth-100 border-b border-white/5">Budgetlinjer</p>
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-earth-500">Ingen linjer endnu</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map((r) => (
              <div key={r.line.id} className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-earth-100">
                    {r.line.source === "udgift" && (CATEGORY_LABEL[r.line.category!] ?? r.line.category)}
                    {r.line.source === "salg" && "Forventet salg"}
                    {r.line.source === "arbejdstid" && TASK_TYPE_LABELS[r.line.task_type as keyof typeof TASK_TYPE_LABELS]}
                  </p>
                  {r.line.description && <p className="text-[11px] text-earth-500 mt-0.5">{r.line.description}</p>}
                  {r.line.source === "salg" && r.line.estimated_quantity && r.line.estimated_price_per_unit && (
                    <p className="text-[11px] text-earth-600 mt-0.5">
                      {r.line.estimated_quantity.toLocaleString("da-DK")} {r.line.estimated_unit} × {r.line.estimated_price_per_unit} kr
                    </p>
                  )}
                  <p className="text-[11px] text-earth-500 mt-0.5">
                    Skøn: {r.unit === "kr" ? kr(r.estimated) : `${r.estimated}t`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold" style={{ color: r.actual >= r.estimated ? "#a3e635" : "#f87171" }}>
                    {r.unit === "kr" ? kr(r.actual) : `${r.actual}t`}
                  </p>
                  <p className="text-[10px] text-earth-600">faktisk</p>
                </div>
                <DeleteLineButton lineId={r.line.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      <BudgetLineForm
        farmId={farm.id}
        operatingBudgetId={id}
        departmentId={budget.department_id}
        periodStart={budget.period_start}
        periodEnd={budget.period_end}
      />

      <DeleteBudgetButton budgetId={id} />
    </div>
  );
}
