import { test } from "node:test";
import assert from "node:assert/strict";
import { byDate, isMonth, monthLabel, monthRange, noteDate, shiftMonth, todoCsv, todoFileName, totalPaise, type TodoNote } from "./todo.ts";

test("months move across the year end and give a date range", () => {
  assert.equal(isMonth("2026-11"), true);
  assert.equal(isMonth("2026-13"), false);
  assert.equal(isMonth("26-11"), false);
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.deepEqual(monthRange("2026-12"), { from: "2026-12-01", to: "2027-01-01" });
  assert.equal(monthLabel("2026-11"), "November 2026");
  assert.equal(noteDate("2026-11-07"), "7 Nov 2026");
  assert.equal(todoFileName("2026-11", "pdf"), "LaPatisserieMadras-ToDo-2026-11.pdf");
});

const note = (n: Partial<TodoNote>): TodoNote => ({ id: "1", entry_date: "2026-11-07", bill_note: null, price_paise: null, ...n });

test("several notes on the same date are grouped with that date's total", () => {
  const groups = byDate([
    note({ id: "a", entry_date: "2026-11-08", price_paise: 100 }),
    note({ id: "b", entry_date: "2026-11-07", price_paise: 250 }),
    note({ id: "c", entry_date: "2026-11-07", bill_note: "Milk" }),
  ]);
  assert.deepEqual(groups.map((g) => [g.date, g.notes.map((n) => n.id), g.totalPaise]), [
    ["2026-11-08", ["a"], 100],
    ["2026-11-07", ["b", "c"], 250],
  ]);
  assert.equal(totalPaise([{ price_paise: 100 }, { price_paise: null }]), 100);
});

test("the CSV has date, bill note and amount: BOM, quoted commas and quotes, no formulas, a total", () => {
  const csv = todoCsv([
    note({ bill_note: 'Butter, 5 kg "A12"', price_paise: 225000 }),
    note({ bill_note: "=SUM(A1)", price_paise: 5050 }),
  ]);
  assert.ok(csv.startsWith("\uFEFFDate,Bill note,Amount (Rs)\r\n"));
  const lines = csv.slice(1).trim().split("\r\n");
  assert.equal(lines[1], '2026-11-07,"Butter, 5 kg ""A12""",2250.00');
  assert.equal(lines[2], "2026-11-07,'=SUM(A1),50.50");
  assert.equal(lines[3], ",Total,2300.50");
  assert.equal(todoCsv([]), "\uFEFFDate,Bill note,Amount (Rs)\r\n");
});
