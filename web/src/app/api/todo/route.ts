import type { NextRequest } from "next/server";
import { z } from "zod";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBusinessTimezone } from "@/lib/settings";
import { zonedDayKey } from "@/lib/time";
import { TODO_COLUMNS, isMonth, monthRange, todoCsv, todoFileName, type TodoNote } from "@/lib/todo";
import { renderTodoPdf } from "@/lib/todo-pdf";

const query = z.object({
  format: z.enum(["csv", "pdf"]).default("pdf"),
  month: z.string().refine(isMonth).optional(),
});

// The signed-in staff member's own to-do notes for a month, as CSV (Excel) or PDF.
export async function GET(request: NextRequest) {
  const staff = await getStaff();
  if (!staff) return Response.json({ ok: false, message: "Sign in again." }, { status: 401 });
  if (staff.role !== "admin" && staff.role !== "counter") {
    return Response.json({ ok: false, message: "Only admin and counter staff have a to-do list." }, { status: 403 });
  }
  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return Response.json({ ok: false, message: "Choose CSV or PDF and a month." }, { status: 400 });
  const { format } = parsed.data;
  const month = parsed.data.month ?? zonedDayKey(new Date(), await getBusinessTimezone()).slice(0, 7);
  const { from, to } = monthRange(month);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diary_entries")
    .select(TODO_COLUMNS)
    .gte("entry_date", from)
    .lt("entry_date", to)
    .order("entry_date")
    .order("created_at");
  if (error) return Response.json({ ok: false, message: "Could not read the notes." }, { status: 500 });
  const notes = (data ?? []) as TodoNote[];

  const body = format === "csv" ? todoCsv(notes) : new Uint8Array(await renderTodoPdf(notes, month, staff.fullName));
  return new Response(body, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/pdf",
      "Content-Disposition": `attachment; filename="${todoFileName(month, format)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
