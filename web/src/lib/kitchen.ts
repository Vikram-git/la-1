// The chef screen (2026-10-20): rows from public.chef_work grouped into orders. No amounts reach it.
import type { Database } from "./database.types";
import { addDays } from "./time.ts";

export type ChefRow = Database["public"]["Functions"]["chef_work"]["Returns"][number];

export type KitchenTab = "today" | "tomorrow" | "later";
export const KITCHEN_TABS: { key: KitchenTab; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "later", label: "Next 2 weeks" },
];

export function kitchenTab(value: unknown): KitchenTab {
  return value === "tomorrow" || value === "later" ? value : "today";
}

// Business-time date range [from, to] (inclusive) for a tab.
export function tabRange(tab: KitchenTab, todayKey: string): { from: string; to: string } {
  if (tab === "tomorrow") return { from: addDays(todayKey, 1), to: addDays(todayKey, 1) };
  if (tab === "later") return { from: addDays(todayKey, 2), to: addDays(todayKey, 15) };
  return { from: todayKey, to: todayKey };
}

export type CakeInfo = {
  flavour?: string;
  weight_kg?: number | string;
  tiers?: number;
  theme?: string;
  design?: string;
  model?: string;
  fondant?: string;
  cream?: string;
  filling?: string;
  toppings?: string;
  message?: string;
  is_eggless?: boolean;
  has_cupcakes?: boolean;
  has_popsicles?: boolean;
  instructions?: string;
  photo_path?: string;
};

export type ChefLine = {
  id: string;
  name: string;
  size: string;
  quantity: number;
  isVeg: boolean;
  isEggless: boolean;
  notes: string | null;
  kitchenId: string | null;
  kitchenName: string | null;
  imageUrl: string | null;
  cake: CakeInfo | null;
};

export type ChefOrder = {
  id: string;
  reference: string;
  status: ChefRow["status"];
  dueAt: string;
  isImmediate: boolean;
  fulfilment: ChefRow["fulfilment"];
  lines: ChefLine[];
};

// Rows arrive sorted by pickup time, order and line; one card per order, cancelled orders last.
export function groupChefWork(rows: ChefRow[], kitchenId: string | null = null): ChefOrder[] {
  const orders = new Map<string, ChefOrder>();
  for (const r of rows) {
    // A kitchen filter still shows lines nobody has routed yet, so they are never missed.
    if (kitchenId && r.kitchen_id && r.kitchen_id !== kitchenId) continue;
    let o = orders.get(r.order_id);
    if (!o) {
      o = {
        id: r.order_id,
        reference: r.reference,
        status: r.status,
        dueAt: r.due_at,
        isImmediate: r.is_immediate,
        fulfilment: r.fulfilment,
        lines: [],
      };
      orders.set(r.order_id, o);
    }
    o.lines.push({
      id: r.item_id,
      name: r.product_name,
      size: r.variant_name,
      quantity: r.quantity,
      isVeg: r.is_veg,
      isEggless: r.is_eggless,
      notes: r.notes,
      kitchenId: r.kitchen_id,
      kitchenName: r.kitchen_name,
      imageUrl: r.image_url,
      cake: (r.cake as CakeInfo | null) ?? null,
    });
  }
  const list = [...orders.values()];
  const rank = (o: ChefOrder) => (o.status === "cancelled" ? 2 : o.status === "ready" ? 1 : 0);
  return list.sort((a, b) => rank(a) - rank(b) || a.dueAt.localeCompare(b.dueAt));
}

// "12 × Chocolate truffle" totals across the open (not packed, not cancelled) orders shown.
export function itemTotals(orders: ChefOrder[]): { name: string; size: string; quantity: number }[] {
  const totals = new Map<string, { name: string; size: string; quantity: number }>();
  for (const o of orders) {
    if (o.status === "cancelled" || o.status === "ready") continue;
    for (const l of o.lines) {
      if (l.cake) continue;
      const key = `${l.name}\u0000${l.size}`;
      const t = totals.get(key) ?? { name: l.name, size: l.size, quantity: 0 };
      t.quantity += l.quantity;
      totals.set(key, t);
    }
  }
  return [...totals.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
}

// Cake details as labelled rows, in the order a chef reads them.
export function cakeRows(c: CakeInfo): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const add = (label: string, value: string | undefined | null) => {
    if (value && String(value).trim()) rows.push({ label, value: String(value).trim() });
  };
  add("Flavour", c.flavour);
  if (c.weight_kg != null) add("Weight", `${Number(c.weight_kg)} kg${c.tiers && c.tiers > 1 ? ` · ${c.tiers} tiers` : ""}`);
  add("Theme", c.theme);
  add("Design", c.design);
  add("Model", c.model);
  add("Fondant", c.fondant);
  add("Cream", c.cream);
  add("Filling", c.filling);
  add("Toppings", c.toppings);
  add("Message on cake", c.message ? `“${c.message}”` : null);
  const extras = [c.has_cupcakes && "Cupcakes", c.has_popsicles && "Popsicles"].filter(Boolean).join(", ");
  add("Extras", extras);
  add("Instructions", c.instructions);
  return rows;
}
