import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDepartmentResolvers } from "@/lib/departmentAttribution";
import { TASK_TYPE_LABELS } from "@/lib/taskTimeEstimates";

function kr(n: number): string {
  return `${Math.round(n).toLocaleString("da-DK")} kr`;
}

/**
 * Bygger en selvstændig "## Økonomi"-sektion (afdelinger, rentabilitet,
 * driftsbudget, projekter) til brug i eksport-funktionen. Holdes adskilt fra
 * buildFarmContext() i farmContext.ts, så AI-rådgiverens almindelige chat
 * (som kører på hver besked) ikke skal betale for disse ekstra opslag —
 * kun eksport-siden kalder denne.
 */
export async function buildEconomyContext(supabase: SupabaseClient, farmId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;

  const [
    { data: farm },
    { data: departments },
    { data: expenses },
    { data: harvestLogs },
    { data: animalLogs },
    { data: farmTasks },
    { data: allPlantings },
    { data: operatingBudgets },
    { data: allBudgetLines },
    { data: projects },
    { data: allImpacts },
    resolvers,
  ] = await Promise.all([
    supabase.from("farms").select("default_hourly_rate_dkk").eq("id", farmId).single(),
    supabase.from("departments").select("id, name").eq("farm_id", farmId).order("name"),
    supabase.from("farm_expenses").select("category, amount_dkk, flock_id, department_id")
      .eq("farm_id", farmId).gte("date", yearStart),
    supabase.from("harvest_logs").select("planting_id, quantity_kg, price_per_kg")
      .eq("farm_id", farmId).gte("harvest_date", yearStart),
    supabase.from("animal_product_logs").select("flock_id, quantity, price_per_unit, sold_to_type")
      .eq("farm_id", farmId).gte("log_date", yearStart),
    supabase.from("farm_tasks").select("task_type, actual_minutes, flock_id, bed_planting_id, done_at")
      .eq("farm_id", farmId).eq("status", "done").not("actual_minutes", "is", null).gte("done_at", yearStart),
    supabase.from("bed_plantings").select("id, crop_name, variety").eq("farm_id", farmId),
    supabase.from("operating_budgets").select("id, department_id, period_label, period_start, period_end").eq("farm_id", farmId),
    supabase.from("budget_lines").select("*").eq("farm_id", farmId),
    supabase.from("budget_projects").select("*").eq("farm_id", farmId),
    supabase.from("project_operating_impact").select("*").eq("farm_id", farmId),
    buildDepartmentResolvers(supabase, farmId),
  ]);

  const hourlyRate = (farm as { default_hourly_rate_dkk: number | null } | null)?.default_hourly_rate_dkk ?? null;
  const deptNameById: Record<string, string> = {};
  for (const d of departments ?? []) deptNameById[d.id] = d.name;

  let ctx = `\n## Økonomi (${currentYear}, år-til-dato)\n`;
  if (hourlyRate) ctx += `Timesats: ${hourlyRate} kr/time\n`;

  // ── Pr. afdeling ──────────────────────────────────────────────────────
  const deptRevenue: Record<string, number> = {};
  const deptExpense: Record<string, number> = {};
  const deptMinutes: Record<string, number> = {};
  const add = (map: Record<string, number>, d: string | null, amt: number) => { if (d) map[d] = (map[d] ?? 0) + amt; };

  for (const l of harvestLogs ?? []) add(deptRevenue, resolvers.deptForPlantingId(l.planting_id), (l.quantity_kg ?? 0) * (l.price_per_kg ?? 0));
  for (const l of animalLogs ?? []) if (l.sold_to_type !== "ikke_solgt") add(deptRevenue, resolvers.deptForFlockId(l.flock_id), l.quantity * (l.price_per_unit ?? 0));
  for (const e of expenses ?? []) {
    const d = resolvers.deptForExpense(e);
    if (e.amount_dkk < 0) add(deptExpense, d, Math.abs(e.amount_dkk));
    else add(deptRevenue, d, e.amount_dkk);
  }
  for (const t of farmTasks ?? []) {
    const d = resolvers.deptForFlockId(t.flock_id) ?? resolvers.deptForPlantingId(t.bed_planting_id);
    if (d) deptMinutes[d] = (deptMinutes[d] ?? 0) + (t.actual_minutes ?? 0);
  }

  ctx += `\n### Afdelinger\n`;
  if (!departments || departments.length === 0) {
    ctx += `Ingen afdelinger oprettet endnu.\n`;
  } else {
    for (const d of departments) {
      const revenue = deptRevenue[d.id] ?? 0;
      const expense = deptExpense[d.id] ?? 0;
      const minutes = deptMinutes[d.id] ?? 0;
      const net = revenue - expense;
      const hours = Math.round((minutes / 60) * 10) / 10;
      ctx += `- ${d.name}: indtægt ${kr(revenue)}, udgift ${kr(expense)}, resultat ${kr(net)}, ${hours}t logget arbejdstid`;
      if (hourlyRate && minutes > 0) ctx += ` (≈${kr(hours * hourlyRate)})`;
      ctx += `\n`;
    }
  }

  // ── Pr. sort ──────────────────────────────────────────────────────────
  const plantingLabel: Record<string, string> = {};
  for (const p of allPlantings ?? []) plantingLabel[p.id] = `${p.crop_name}${p.variety ? ` · ${p.variety}` : ""}`;
  const varietyRevenue: Record<string, number> = {};
  const varietyMinutes: Record<string, number> = {};
  for (const l of harvestLogs ?? []) {
    if (!l.planting_id) continue;
    const label = plantingLabel[l.planting_id];
    if (!label) continue;
    varietyRevenue[label] = (varietyRevenue[label] ?? 0) + (l.quantity_kg ?? 0) * (l.price_per_kg ?? 0);
  }
  for (const t of farmTasks ?? []) {
    if (!t.bed_planting_id) continue;
    const label = plantingLabel[t.bed_planting_id];
    if (!label) continue;
    varietyMinutes[label] = (varietyMinutes[label] ?? 0) + (t.actual_minutes ?? 0);
  }
  const varietyLabels = new Set([...Object.keys(varietyRevenue), ...Object.keys(varietyMinutes)]);
  if (varietyLabels.size > 0) {
    ctx += `\n### Rentabilitet pr. sort\n`;
    const sorted = [...varietyLabels]
      .map((label) => {
        const revenue = varietyRevenue[label] ?? 0;
        const minutes = varietyMinutes[label] ?? 0;
        const perHour = minutes > 0 ? revenue / (minutes / 60) : null;
        return { label, revenue, minutes, perHour };
      })
      .sort((a, b) => (b.perHour ?? b.revenue) - (a.perHour ?? a.revenue));
    for (const v of sorted) {
      ctx += `- ${v.label}: ${kr(v.revenue)}`;
      if (v.minutes > 0) ctx += `, ${Math.round((v.minutes / 60) * 10) / 10}t`;
      if (v.perHour !== null) ctx += ` → ${kr(v.perHour)}/time`;
      ctx += `\n`;
    }
  }

  // ── Driftsbudgetter ───────────────────────────────────────────────────
  if (operatingBudgets && operatingBudgets.length > 0) {
    ctx += `\n### Driftsbudgetter\n`;
    for (const b of operatingBudgets) {
      const lines = (allBudgetLines ?? []).filter((l) => l.operating_budget_id === b.id);
      const deptLabel = b.department_id ? deptNameById[b.department_id] ?? "Ukendt afdeling" : "Hele gården";
      ctx += `\n#### ${deptLabel} — ${b.period_label} (${b.period_start} til ${b.period_end})\n`;
      if (lines.length === 0) {
        ctx += `Ingen linjer endnu.\n`;
        continue;
      }
      for (const l of lines) {
        if (l.source === "arbejdstid") {
          ctx += `- Arbejdstid (${TASK_TYPE_LABELS[l.task_type as keyof typeof TASK_TYPE_LABELS] ?? l.task_type}): skøn ${l.estimated_hours ?? 0}t`;
        } else {
          const kind = l.source === "udgift" ? (l.category ?? "udgift") : "forventet salg";
          ctx += `- ${kind}: skøn ${kr(l.estimated_amount_dkk ?? 0)}`;
          if (l.estimated_quantity && l.estimated_price_per_unit) {
            ctx += ` (${l.estimated_quantity} ${l.estimated_unit} × ${l.estimated_price_per_unit} kr)`;
          }
        }
        if (l.description) ctx += ` — ${l.description}`;
        ctx += `\n`;
      }
    }
  }

  // ── Projekter ─────────────────────────────────────────────────────────
  if (projects && projects.length > 0) {
    ctx += `\n### Opstartsprojekter\n`;
    for (const p of projects) {
      const lines = (allBudgetLines ?? []).filter((l) => l.project_id === p.id);
      const totalEstimated = lines.reduce((s, l) => s + Math.abs(l.estimated_amount_dkk ?? 0), 0);
      const impacts = (allImpacts ?? []).filter((i) => i.project_id === p.id);
      const netAnnual = impacts.reduce((s, i) => s + i.estimated_annual_revenue_delta_dkk - i.estimated_annual_cost_delta_dkk, 0);
      const payback = netAnnual > 0 && totalEstimated > 0 ? totalEstimated / netAnnual : null;
      const deptLabel = p.department_id ? deptNameById[p.department_id] ?? "Ukendt afdeling" : "Hele gården / tværgående";

      ctx += `\n#### ${p.name} [${p.status}] — ${deptLabel}\n`;
      if (p.description) ctx += `${p.description}\n`;
      if (p.expected_outcome) ctx += `Forventet gevinst: ${p.expected_outcome}\n`;
      ctx += `Skønnet investering: ${kr(totalEstimated)}\n`;
      if (impacts.length > 0) {
        ctx += `Forventet driftspåvirkning: ${kr(netAnnual)}/år netto`;
        if (payback !== null) ctx += ` → tilbagebetalingstid ≈ ${Math.round(payback * 10) / 10} år`;
        ctx += `\n`;
      }
    }
  }

  return ctx;
}
