import Link from "next/link";
import { fulfilmentRowClass, type Fulfilment, type OrderSource, type OrderStatus } from "@/lib/orders";
import { formatTime } from "@/lib/time";
import { cx } from "@/components/ui";
import { FulfilmentBadge, SourceBadge, StatusBadge } from "@/components/order-badges";

// Columns selected from order_summaries by the calendar page.
export type CalendarOrder = {
  id: string | null;
  reference: string | null;
  source: OrderSource | null;
  status: OrderStatus | null;
  customer_name: string | null;
  due_at: string | null;
  item_count: number | null;
  fulfilment: Fulfilment | null;
  setup_address: string | null;
  cake?: CalendarCake | null;
};

// A custom cake's headline details, joined on by the calendar page.
export type CalendarCake = {
  flavour: string;
  weight_kg: number;
  tiers: number;
  fondant: string | null;
  theme: string | null;
};

// "Chocolate truffle · 1.5 kg · Fondant: Full · Theme: Unicorn"
export function cakeSummary(c: CalendarCake): string {
  return [
    c.flavour,
    `${Number(c.weight_kg)} kg${c.tiers > 1 ? ` · ${c.tiers} tiers` : ""}`,
    c.fondant && `Fondant: ${c.fondant}`,
    c.theme && `Theme: ${c.theme}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

// Orders grouped by business-local day ("YYYY-MM-DD"), sorted by due time.
export type OrdersByDay = Map<string, CalendarOrder[]>;

// A custom cake's details as labelled columns in the middle of a calendar row.
function CakeDetails({ cake, fulfilment, setupAddress }: { cake: CalendarCake; fulfilment: Fulfilment | null; setupAddress: string | null }) {
  const cells: [string, string, string?][] = [
    ["🎂 Cake", cake.flavour],
    ["Weight", `${Number(cake.weight_kg)} kg${cake.tiers > 1 ? ` · ${cake.tiers} tiers` : ""}`],
    ["Fondant", cake.fondant ?? "—"],
    ["Theme", cake.theme ?? "—"],
    fulfilment === "setup"
      ? ["Location", `Set up at: ${setupAddress ?? "—"}`, "text-danger"]
      : ["Location", "Collect from store", "text-ok"],
  ];
  return (
    <dl className="grid min-w-64 flex-1 grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 xl:grid-cols-5">
      {cells.map(([label, value, tone]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-muted">{label}</dt>
          <dd className={cx("truncate text-sm font-medium", tone)} title={value}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function OrderList({ orders, tz }: { orders: CalendarOrder[]; tz: string }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/admin/orders/${o.id}`} className={cx("flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-canvas/60", fulfilmentRowClass(o.fulfilment), o.status === "pending_confirmation" && "bg-warn-soft/40")}>
            <span className="w-20 font-semibold tabular-nums">{o.due_at && formatTime(o.due_at, tz)}</span>
            <span className="font-mono text-sm">{o.reference}</span>
            <span className={cx("min-w-32", o.cake ? "w-40" : "flex-1")}>
              {o.customer_name ?? "Walk-in"}
              {!o.cake && o.fulfilment === "setup" && o.setup_address && (
                <span className="block text-xs font-medium text-danger">Set up at: {o.setup_address}</span>
              )}
            </span>
            {o.cake && <CakeDetails cake={o.cake} fulfilment={o.fulfilment} setupAddress={o.setup_address} />}
            <span className="text-sm text-muted">{o.item_count} item{o.item_count === 1 ? "" : "s"}</span>
            {o.fulfilment && <FulfilmentBadge fulfilment={o.fulfilment} />}
            {o.source && <SourceBadge source={o.source} />}
            {o.status && <StatusBadge status={o.status} />}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
