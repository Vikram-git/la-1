import type { PostgrestError } from "@supabase/supabase-js";
import type { Enums } from "@/lib/database.types";

export type OrderStatus = Enums<"order_status">;
export type OrderSource = Enums<"order_source">;
export type PaymentMethod = Enums<"payment_method">;

export const statusLabel: Record<OrderStatus, string> = {
  draft: "Draft",
  pending_confirmation: "Pending confirmation",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

// Colours follow the owner's mock-up: pending pink, confirmed blue, preparing yellow, done green.
export const statusTone: Record<OrderStatus, "neutral" | "brand" | "info" | "ok" | "warn" | "danger"> = {
  draft: "neutral",
  pending_confirmation: "brand",
  confirmed: "info",
  preparing: "warn",
  ready: "ok",
  completed: "ok",
  rejected: "danger",
  cancelled: "danger",
};

// The top-bar search (scope=all) looks in both lists and every status; the search box on the
// orders page stays within the list and filters shown.
export function searchEverywhere(q: string, scope: string): boolean {
  return q.length > 0 && scope === "all";
}

export const sourceLabel: Record<OrderSource, string> = {
  IN_STORE: "In-store",
  ONLINE: "Online",
  CALL: "Call",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank transfer",
  other: "Other",
};

export const OPEN_STATUSES: OrderStatus[] = ["draft", "pending_confirmation", "confirmed", "preparing", "ready"];

export type RpcFailure = { ok?: false; message?: string; kind?: string };

// Order functions raise staff-facing messages with a category in `hint` (see migration 0200).
export function rpcError(error: PostgrestError): RpcFailure {
  if (error.code === "P0001") {
    return { message: error.message, kind: error.hint ?? "validation" };
  }
  if (error.code === "42501") return { message: "You do not have permission to do this.", kind: "forbidden" };
  return { message: `Something went wrong: ${error.message}`, kind: "error" };
}

// Refusals an admin may override with a recorded reason (AC-32, AC-36). "balance": handing over
// with money still due, as an admin credit exception (AC-10).
export const OVERRIDABLE_KINDS = new Set(["slot", "lead_time", "blocked", "capacity", "balance"]);

// Matches the database check in create_order, confirm_order and reschedule_order.
export const OVERRIDE_REASON_MIN = 5;
