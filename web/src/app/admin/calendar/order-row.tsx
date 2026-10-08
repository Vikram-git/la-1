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
};

// Orders grouped by business-local day ("YYYY-MM-DD"), sorted by due time.
export type OrdersByDay = Map<string, CalendarOrder[]>;

export function OrderList({ orders, tz }: { orders: CalendarOrder[]; tz: string }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/admin/orders/${o.id}`} className={cx("flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-canvas/60", fulfilmentRowClass(o.fulfilment), o.status === "pending_confirmation" && "bg-warn-soft/40")}>
            <span className="w-20 font-semibold tabular-nums">{o.due_at && formatTime(o.due_at, tz)}</span>
            <span className="font-mono text-sm">{o.reference}</span>
            <span className="min-w-32 flex-1">
              {o.customer_name ?? "Walk-in"}
              {o.fulfilment === "setup" && o.setup_address && (
                <span className="block text-xs font-medium text-danger">Set up at: {o.setup_address}</span>
              )}
            </span>
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
