import Link from "next/link";
import { addDays } from "@/lib/time";
import { cx } from "@/components/ui";
import { plural, type OrdersByDay } from "./order-row";

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthView({ gridStart, month, today, byDay, closureByDay, dayHref }: {
  gridStart: string;
  month: string; // "YYYY-MM"
  today: string;
  byDay: OrdersByDay;
  closureByDay: Map<string, string>;
  dayHref: (day: string) => string;
}) {
  return (
    <div className="md:overflow-x-auto">
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm md:min-w-[700px]">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-canvas px-1 py-1.5 text-center text-xs font-medium uppercase text-muted md:px-2 md:text-left md:tracking-wider">
            <span className="md:hidden">{d.slice(0, 1)}</span>
            <span className="hidden md:inline">{d}</span>
          </div>
        ))}
        {Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)).map((day) => {
          const dayOrders = byDay.get(day) ?? [];
          const pending = dayOrders.filter((o) => o.status === "pending_confirmation").length;
          const inMonth = day.startsWith(month);
          return (
            <Link key={day} href={dayHref(day)}
              className={cx("flex min-h-16 flex-col gap-1 bg-surface p-1 hover:bg-brand-soft/50 md:min-h-24 md:p-2", !inMonth && "bg-canvas/60 text-muted", day === today && "ring-2 ring-inset ring-brand")}>
              <span className="text-xs font-medium">{Number(day.slice(8))}</span>
              {/* Phones: just the order count. */}
              {dayOrders.length > 0 && (
                <span className="text-xs font-semibold md:hidden" aria-label={plural(dayOrders.length, "order")}>{dayOrders.length}</span>
              )}
              {closureByDay.has(day) && <span className="text-xs text-danger"><span className="md:hidden">✕</span><span className="hidden md:inline">Closed</span></span>}
              <span className="hidden flex-col gap-1 md:flex">
              {dayOrders.length > 0 && <span className="font-semibold">{plural(dayOrders.length, "order")}</span>}
              {pending > 0 && <span className="text-xs text-warn">{pending} pending</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
