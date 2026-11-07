"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseRupeesToPaise } from "@/lib/money";

type Result = { ok: true } | { ok?: false; message: string };

// The database keeps every note to the staff member who wrote it (row-level security on diary_entries).
const notesSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  notes: z
    .array(z.object({
      billNote: z.string().trim().max(1000, "Keep each bill note under 1000 characters."),
      amount: z.string().trim().max(16),
    }))
    .min(1)
    .max(30, "Add at most 30 notes at a time."),
});

// Saves every filled row for the date at once; rows left empty are skipped.
export async function addTodoNotesAction(input: z.input<typeof notesSchema>): Promise<Result> {
  await assertRole(["admin", "counter"]);
  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the notes." };

  const rows: { entry_date: string; bill_note: string | null; price_paise: number | null }[] = [];
  for (const n of parsed.data.notes) {
    if (!n.billNote && !n.amount) continue;
    let pricePaise: number | null = null;
    if (n.amount) {
      pricePaise = parseRupeesToPaise(n.amount);
      if (pricePaise === null || pricePaise > 100_000_000_000) return { message: "Enter the amount in rupees, e.g. 250 or 250.50." };
    }
    rows.push({ entry_date: parsed.data.date, bill_note: n.billNote || null, price_paise: pricePaise });
  }
  if (rows.length === 0) return { message: "Write a bill note or an amount." };

  const supabase = await createClient();
  const { error } = await supabase.from("diary_entries").insert(rows);
  if (error) return { message: "Not saved. Try again." };
  revalidatePath("/admin/todo");
  return { ok: true };
}

export async function deleteTodoNoteAction(input: { id: string }): Promise<Result> {
  await assertRole(["admin", "counter"]);
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { message: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.from("diary_entries").delete().eq("id", parsed.data.id);
  if (error) return { message: "Not deleted. Try again." };
  revalidatePath("/admin/todo");
  return { ok: true };
}
