"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Field, Input, Textarea, cx } from "@/components/ui";
import { formatPaise } from "@/lib/money";
import { byDate, monthLabel, noteDate, shiftMonth, totalPaise, type TodoNote } from "@/lib/todo";
import { addTodoNotesAction, deleteTodoNoteAction } from "./actions";

type Row = { key: number; billNote: string; amount: string };
let nextKey = 1;
const emptyRow = (): Row => ({ key: nextKey++, billNote: "", amount: "" });

// The signed-in staff member's own notes for one month (owner, 2026-11-07). Nobody else, not even the
// admin, can see them.
export function TodoList({ notes, month, today }: { notes: TodoNote[]; month: string; today: string }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const filled = rows.some((r) => r.billNote.trim() || r.amount.trim());
  const setRow = (key: number, patch: Partial<Row>) => {
    setError(null);
    setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      let result: { ok?: boolean; message?: string };
      try {
        result = await addTodoNotesAction({ date, notes: rows.map(({ billNote, amount }) => ({ billNote, amount })) });
      } catch {
        result = { message: "Not saved, check the connection." };
      }
      if (result.ok) {
        setRows([emptyRow()]);
        router.refresh();
      } else {
        setError(result.message ?? "Something went wrong.");
      }
    });
  }

  function remove(n: TodoNote) {
    if (!window.confirm(`Delete this note from ${noteDate(n.entry_date)}?`)) return;
    setError(null);
    setBusyId(n.id);
    start(async () => {
      let result: { ok?: boolean; message?: string };
      try {
        result = await deleteTodoNoteAction({ id: n.id });
      } catch {
        result = { message: "Not deleted, check the connection." };
      }
      setBusyId(null);
      if (result.ok) router.refresh();
      else setError(result.message ?? "Something went wrong.");
    });
  }

  const download = (format: "csv" | "pdf") => `/api/todo?format=${format}&month=${month}`;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form onSubmit={save} className="flex flex-col gap-4">
          <Field label="Date" htmlFor="todo-date" className="max-w-56">
            <Input id="todo-date" type="date" required value={date} onChange={(e) => { setError(null); setDate(e.target.value); }} />
          </Field>
          <ol className="flex flex-col gap-3">
            {rows.map((r, i) => (
              <li key={r.key} className="grid items-start gap-3 rounded-xl border border-line bg-canvas/50 p-3 sm:grid-cols-[1fr_10rem_auto]">
                <Field label={rows.length > 1 ? `Bill note ${i + 1}` : "Bill note"} htmlFor={`todo-note-${r.key}`}>
                  <Textarea id={`todo-note-${r.key}`} rows={2} maxLength={1000} value={r.billNote} className="min-h-12"
                    onChange={(e) => setRow(r.key, { billNote: e.target.value })}
                    placeholder="e.g. Bill no. 1432, Sri Murugan Stores, 5 kg butter" />
                </Field>
                <Field label="Amount (₹)" htmlFor={`todo-amount-${r.key}`}>
                  <Input id={`todo-amount-${r.key}`} inputMode="decimal" maxLength={16} value={r.amount}
                    onChange={(e) => setRow(r.key, { amount: e.target.value })} placeholder="0.00" />
                </Field>
                {rows.length > 1 && (
                  <button type="button" onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-danger hover:bg-danger-soft sm:mt-7">
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setRows([...rows, emptyRow()])} disabled={rows.length >= 30}>
              + Add another note
            </Button>
            <Button type="submit" disabled={pending || !filled}>
              {pending && busyId === null ? "Saving…" : rows.length > 1 ? `Save ${rows.length} notes` : "Save note"}
            </Button>
          </div>
          {error && <Alert tone="danger">{error}</Alert>}
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm">
            <Link href={`/admin/todo?month=${shiftMonth(month, -1)}`} className="text-brand-strong hover:underline" aria-label="Previous month">←</Link>
            <h2 className="text-lg font-semibold">{monthLabel(month)}</h2>
            <Link href={`/admin/todo?month=${shiftMonth(month, 1)}`} className="text-brand-strong hover:underline" aria-label="Next month">→</Link>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <a href={download("pdf")} className="rounded-full border border-line px-3 py-1 font-medium text-brand-strong hover:bg-brand-soft">Download PDF</a>
            <a href={download("csv")} className="rounded-full border border-line px-3 py-1 font-medium text-brand-strong hover:bg-brand-soft">Download CSV</a>
          </div>
        </div>

        {notes.length === 0 ? (
          <p className="text-sm text-muted">No notes for {monthLabel(month)} yet.</p>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {byDate(notes).map((g) => (
                <section key={g.date} aria-label={noteDate(g.date)}>
                  <div className="flex items-baseline justify-between border-b border-line pb-1">
                    <h3 className="font-semibold">{noteDate(g.date)}</h3>
                    {g.totalPaise > 0 && <span className="text-sm text-muted">{formatPaise(g.totalPaise)}</span>}
                  </div>
                  <ul className="divide-y divide-line">
                    {g.notes.map((n) => (
                      <li key={n.id} className={cx("flex items-start gap-3 py-2", busyId === n.id && "opacity-60")}>
                        <p className="min-w-0 flex-1 whitespace-pre-line text-sm">{n.bill_note ?? <span className="text-muted">—</span>}</p>
                        <span className="w-28 text-right text-sm font-medium tabular-nums">{n.price_paise === null ? "" : formatPaise(n.price_paise)}</span>
                        <button type="button" disabled={pending} onClick={() => remove(n)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-danger hover:bg-danger-soft disabled:opacity-60">
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <p className="mt-4 border-t border-line pt-3 text-right text-sm">
              {notes.length} {notes.length === 1 ? "note" : "notes"} · <span className="font-semibold">Total {formatPaise(totalPaise(notes))}</span>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
