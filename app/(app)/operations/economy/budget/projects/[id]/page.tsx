import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { EXPENSE_CATEGORIES } from "@/lib/expenseCategories";
import ProjectLineForm from "../ProjectLineForm";
import ImpactLineForm from "../ImpactLineForm";
import DeleteRowButton from "../DeleteRowButton";
import ProjectStatusControl from "../ProjectStatusControl";
import DeleteProjectButton from "./DeleteProjectButton";

const CATEGORY_LABEL = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.v, c.l]));

function fmtShort(d: string) {
  const DA_MONTHS = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
  const date = new Date(d);
  return `${date.getDate()}. ${DA_MONTHS[date.getMonth()]}`;
}
function kr(n: number) {
  return `${Math.round(n).toLocaleString("da-DK")} kr`;
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
  if (!farm) return notFound();

  const { data: project } = await supabase
    .from("budget_projects")
    .select("*")
    .eq("id", id)
    .eq("farm_id", farm.id)
    .single();
  if (!project) return notFound();

  const [
    { data: department },
    { data: departments },
    { data: lines },
    { data: expenses },
    { data: impacts },
  ] = await Promise.all([
    project.department_id
      ? supabase.from("departments").select("name").eq("id", project.department_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("departments").select("id, name").eq("farm_id", farm.id).order("name"),
    supabase.from("budget_lines").select("*").eq("project_id", id).order("created_at"),
    supabase.from("farm_expenses").select("category, amount_dkk").eq("farm_id", farm.id).eq("project_id", id),
    supabase.from("project_operating_impact").select("*").eq("project_id", id).order("created_at"),
  ]);

  function actualExpenseForCategory(category: string): number {
    return (expenses ?? [])
      .filter((e) => e.category === category && e.amount_dkk < 0)
      .reduce((s, e) => s + Math.abs(e.amount_dkk), 0);
  }

  const lineRows = (lines ?? []).map((line) => ({
    line,
    estimated: Math.abs(line.estimated_amount_dkk ?? 0),
    actual: line.category ? actualExpenseForCategory(line.category) : 0,
  }));

  const totalEstimated = lineRows.reduce((s, r) => s + r.estimated, 0);
  const totalActualByCategory = lineRows.reduce((s, r) => s + r.actual, 0);
  // Faktisk forbrug i alt — også udgifter uden matchende kategori-linje
  const totalActualAll = (expenses ?? []).filter((e) => e.amount_dkk < 0).reduce((s, e) => s + Math.abs(e.amount_dkk), 0);

  const netAnnualImpact = (impacts ?? []).reduce(
    (s, i) => s + i.estimated_annual_revenue_delta_dkk - i.estimated_annual_cost_delta_dkk,
    0
  );
  const paybackYears = netAnnualImpact > 0 && totalEstimated > 0 ? totalEstimated / netAnnualImpact : null;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Link href="/operations/economy/budget?mode=projekter" className="text-earth-300">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-earth-50">{project.name}</h1>
          <p className="text-earth-300 text-sm mt-0.5">
            {department?.name ?? "Hele gården / tværgående"}
            {project.target_date && <> · mål {fmtShort(project.target_date)}</>}
          </p>
        </div>
      </div>

      <div className="card space-y-3">
        <ProjectStatusControl projectId={id} status={project.status} />
        {project.description && <p className="text-sm text-earth-200">{project.description}</p>}
        {project.expected_outcome && (
          <div className="rounded-lg p-2.5" style={{ background: "rgba(163,230,53,0.06)" }}>
            <p className="text-[10px] font-semibold text-earth-500 uppercase tracking-widest mb-1">Forventet gevinst</p>
            <p className="text-xs text-earth-200">{project.expected_outcome}</p>
          </div>
        )}
      </div>

      {/* Investering */}
      <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-[10px] font-semibold text-earth-500 uppercase tracking-widest mb-1">Investering</p>
        <p className="text-xs text-earth-400">Skøn: {kr(totalEstimated)}</p>
        <p className="text-sm font-bold text-earth-100">
          Faktisk brugt: {kr(totalActualAll)}
          {totalActualAll !== totalActualByCategory && (
            <span className="text-earth-500 font-normal text-xs"> ({kr(totalActualByCategory)} matcher en budgetkategori)</span>
          )}
        </p>
      </div>

      {/* Tilbagebetalingstid */}
      {(impacts ?? []).length > 0 && (
        <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.15)" }}>
          <TrendingUp size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#a3e635" }} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#a3e635" }}>Forventet tilbagebetalingstid</p>
            {paybackYears !== null ? (
              <p className="text-sm text-earth-100 mt-0.5">
                {kr(totalEstimated)} ÷ {kr(netAnnualImpact)}/år ≈ <strong>{Math.round(paybackYears * 10) / 10} år</strong>
              </p>
            ) : (
              <p className="text-xs text-earth-400 mt-0.5">
                Nettoeffekten er ikke positiv endnu — tilføj flere driftspåvirkninger eller tjek beløbene
              </p>
            )}
          </div>
        </div>
      )}

      {/* Budgetlinjer */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="px-4 py-3 text-sm font-semibold text-earth-100 border-b border-white/5">Budgetlinjer</p>
        {lineRows.length === 0 ? (
          <div className="px-4 py-6 text-center"><p className="text-xs text-earth-500">Ingen linjer endnu</p></div>
        ) : (
          <div className="divide-y divide-white/5">
            {lineRows.map((r) => (
              <div key={r.line.id} className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-earth-100">{CATEGORY_LABEL[r.line.category!] ?? r.line.category}</p>
                  {r.line.description && <p className="text-[11px] text-earth-500 mt-0.5">{r.line.description}</p>}
                  <p className="text-[11px] text-earth-500 mt-0.5">Skøn: {kr(r.estimated)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold" style={{ color: r.actual <= r.estimated ? "#a3e635" : "#f87171" }}>{kr(r.actual)}</p>
                  <p className="text-[10px] text-earth-600">faktisk</p>
                </div>
                <DeleteRowButton table="budget_lines" id={r.line.id} />
              </div>
            ))}
          </div>
        )}
      </div>
      <ProjectLineForm farmId={farm.id} projectId={id} />
      <p className="text-[10px] text-earth-600 px-1">
        Log faktisk forbrug som en almindelig udgift under Udgifter-fanen — vælg dette projekt der, så tælles det med her automatisk.
      </p>

      {/* Driftspåvirkning */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="px-4 py-3 text-sm font-semibold text-earth-100 border-b border-white/5">Forventet driftspåvirkning pr. år</p>
        {(impacts ?? []).length === 0 ? (
          <div className="px-4 py-6 text-center"><p className="text-xs text-earth-500">Ingen tilføjet endnu</p></div>
        ) : (
          <div className="divide-y divide-white/5">
            {(impacts ?? []).map((i) => (
              <div key={i.id} className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-earth-100">{i.description ?? "Uden beskrivelse"}</p>
                  <div className="flex gap-3 mt-0.5 text-[11px]">
                    {i.estimated_annual_revenue_delta_dkk > 0 && (
                      <span style={{ color: "#a3e635" }}>+{kr(i.estimated_annual_revenue_delta_dkk)}/år</span>
                    )}
                    {i.estimated_annual_cost_delta_dkk > 0 && (
                      <span style={{ color: "#f87171" }}>−{kr(i.estimated_annual_cost_delta_dkk)}/år</span>
                    )}
                  </div>
                </div>
                <DeleteRowButton table="project_operating_impact" id={i.id} />
              </div>
            ))}
          </div>
        )}
      </div>
      <ImpactLineForm farmId={farm.id} projectId={id} departments={departments ?? []} defaultDepartmentId={project.department_id} />

      <DeleteProjectButton projectId={id} />
    </div>
  );
}
