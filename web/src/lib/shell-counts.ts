import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { attentionCount } from "@/lib/shell";

export type ShellCounts = { pending: number; kitchenAlerts: number; latePickups: number; attention: number };

// Badge numbers for the sidebar and the bell, once per request: orders awaiting confirmation, kitchen
// alerts (tickets with a change not acknowledged, stop-work not acknowledged, open issues) and packed
// orders past their pickup time. Counts only; row-level security applies (admin and counter staff).
export const getShellCounts = cache(async (): Promise<ShellCounts> => {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const head = { count: "exact" as const, head: true };
  const [pending, changes, stopWork, issues, late] = await Promise.all([
    supabase.from("orders").select("id", head).eq("status", "pending_confirmation"),
    supabase.from("kitchen_tickets").select("id", head).eq("has_pending_changes", true).neq("status", "cancelled"),
    supabase.from("kitchen_tickets").select("id", head).eq("status", "cancelled").is("stop_work_acknowledged_at", null),
    supabase.from("kitchen_issues").select("id", head).is("resolved_at", null),
    supabase.from("orders").select("id", head).eq("status", "ready").lt("due_at", nowIso),
  ]);
  const kitchenAlerts = (changes.count ?? 0) + (stopWork.count ?? 0) + (issues.count ?? 0);
  const counts = { pending: pending.count ?? 0, kitchenAlerts, latePickups: late.count ?? 0 };
  return { ...counts, attention: attentionCount(counts) };
});
