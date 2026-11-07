// Each staff member's private to-do list (owner, 2026-11-07): notes of a date, a bill note and an amount,
// as many as needed on the same date, downloadable as CSV or PDF by month. Stored in diary_entries.
// Pure: imported by unit tests, the page and the download route.

export type TodoNote = {
  id: string;
  entry_date: string;
  bill_note: string | null;
  price_paise: number | null;
};

export const TODO_COLUMNS = "id, entry_date, bill_note, price_paise";

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonth(value: unknown): value is string {
  return typeof value === "string" && MONTH.test(value);
}

// "2026-11" → "2026-12"; months run over the year end both ways.
export function shiftMonth(month: string, by: number): string {
  const [, y, m] = MONTH.exec(month)!;
  const index = Number(y) * 12 + Number(m) - 1 + by;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

// The month's first day and the next month's first day, as dates for entry_date >= from and < to.
export function monthRange(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: `${shiftMonth(month, 1)}-01` };
}

export function monthLabel(month: string): string {
  const [, y, m] = MONTH.exec(month)!;
  return new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

// "2026-11-07" → "7 Nov 2026"
export function noteDate(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function totalPaise(notes: Pick<TodoNote, "price_paise">[]): number {
  return notes.reduce((sum, n) => sum + (n.price_paise ?? 0), 0);
}

// Notes grouped by date in the order given, each date with its own total.
export function byDate(notes: TodoNote[]): { date: string; notes: TodoNote[]; totalPaise: number }[] {
  const groups = new Map<string, TodoNote[]>();
  for (const n of notes) groups.set(n.entry_date, [...(groups.get(n.entry_date) ?? []), n]);
  return [...groups].map(([date, list]) => ({ date, notes: list, totalPaise: totalPaise(list) }));
}

// Excel treats a cell starting with = + - @ as a formula, so such text is prefixed with an apostrophe.
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

// With a byte-order mark so Excel opens the ₹ and Tamil text correctly.
export function todoCsv(notes: TodoNote[]): string {
  const rows = [
    ["Date", "Bill note", "Amount (Rs)"],
    ...notes.map((n) => [n.entry_date, n.bill_note ?? "", n.price_paise === null ? "" : (n.price_paise / 100).toFixed(2)]),
  ];
  if (notes.length) rows.push(["", "Total", (totalPaise(notes) / 100).toFixed(2)]);
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function todoFileName(month: string, format: "csv" | "pdf"): string {
  return `LaPatisserieMadras-ToDo-${month}.${format}`;
}
