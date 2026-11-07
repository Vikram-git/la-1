import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBusinessTimezone } from "@/lib/settings";
import { zonedDayKey } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { TODO_COLUMNS, isMonth, monthRange, type TodoNote } from "@/lib/todo";
import { TodoList } from "./todo-list";

export const metadata: Metadata = { title: "To-do list" };

export default async function TodoPage({ searchParams }: PageProps<"/admin/todo">) {
  await requireRole(["admin", "counter"]);
  const today = zonedDayKey(new Date(), await getBusinessTimezone());
  const { month: asked } = await searchParams;
  const month = isMonth(asked) ? asked : today.slice(0, 7);
  const { from, to } = monthRange(month);

  // Only the signed-in staff member's own notes come back (row-level security).
  const supabase = await createClient();
  const { data } = await supabase
    .from("diary_entries")
    .select(TODO_COLUMNS)
    .gte("entry_date", from)
    .lt("entry_date", to)
    .order("entry_date", { ascending: false })
    .order("created_at")
    .limit(1000);

  return (
    <>
      <PageHeader title="To-do list" description="Private: only you can see these notes." />
      <TodoList notes={(data ?? []) as TodoNote[]} month={month} today={today} />
    </>
  );
}
