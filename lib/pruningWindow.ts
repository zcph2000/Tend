import { toISODate } from "@/lib/calendarEvents";

/**
 * Finder den kommende (eller igangværende) forekomst af et tilbagevendende
 * beskæringsvindue angivet som måneder (1-12) — håndterer vinduer der går
 * hen over årsskiftet (fx november-februar).
 */
export function nextPruningWindow(monthFrom: number, monthTo: number, today: Date): { start: Date; end: Date } {
  function windowFor(startYear: number) {
    const start = new Date(startYear, monthFrom - 1, 1);
    const endYear = monthTo >= monthFrom ? startYear : startYear + 1;
    const end = new Date(endYear, monthTo, 0); // sidste dag i monthTo
    return { start, end };
  }
  const w = windowFor(today.getFullYear());
  if (today <= w.end) return w;
  return windowFor(today.getFullYear() + 1);
}

export function pruningTaskDates(monthFrom: number, monthTo: number, today: Date): { dueDate: string; dueDateEnd: string } {
  const { start, end } = nextPruningWindow(monthFrom, monthTo, today);
  const due = start > today ? start : today;
  return { dueDate: toISODate(due), dueDateEnd: toISODate(end) };
}
