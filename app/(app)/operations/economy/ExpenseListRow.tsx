"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import ExpenseForm, { type ExpenseRecord, type DepartmentOption } from "./ExpenseForm";
import { type FlockOption } from "./AnimalProductForm";

const CATEGORY_LABEL: Record<string, string> = {
  frø:"Frø", gødning:"Gødning", planteværn:"Planteværn", redskaber:"Redskaber",
  maskiner:"Maskiner", foder:"Foder", veterinær:"Veterinær",
  forpagning:"Forpagning", tilskud:"Tilskud", løn:"Løn", andet:"Andet",
};

function fmtDate(d: string) {
  const DA_MONTHS = ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december"];
  const date = new Date(d);
  return `${date.getDate()}. ${DA_MONTHS[date.getMonth()]}`;
}

export default function ExpenseListRow({
  expense,
  farmId,
  flocks,
  departments,
  departmentName,
}: {
  expense: ExpenseRecord;
  farmId: string;
  flocks: FlockOption[];
  departments: DepartmentOption[];
  departmentName: string | null;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="px-4 py-3">
        <ExpenseForm
          farmId={farmId}
          flocks={flocks}
          departments={departments}
          existing={expense}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  const flockName = flocks.find(f => f.id === expense.flock_id)?.name;

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:brightness-110 transition-all"
    >
      <span className="text-[11px] text-earth-500 w-16 flex-shrink-0 pt-0.5">{fmtDate(expense.date)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-earth-100">{expense.description ?? CATEGORY_LABEL[expense.category] ?? expense.category}</p>
        <p className="text-[11px] text-earth-500 mt-0.5">
          {CATEGORY_LABEL[expense.category]}
          {flockName && <span> · {flockName}</span>}
          {departmentName && <span> · {departmentName}</span>}
        </p>
      </div>
      <span className="text-xs font-semibold flex-shrink-0 flex items-center gap-1.5"
        style={{ color: expense.amount_dkk >= 0 ? "#a3e635" : "#f87171" }}>
        {expense.amount_dkk >= 0 ? "+" : ""}{Math.round(expense.amount_dkk).toLocaleString("da-DK")} kr
        <Pencil size={11} className="text-earth-600" />
      </span>
    </button>
  );
}
