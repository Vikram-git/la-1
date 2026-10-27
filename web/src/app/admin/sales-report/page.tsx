import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBusinessTimezone } from "@/lib/settings";
import { formatPaise } from "@/lib/money";
import { zonedDayKey, zonedDayRange } from "@/lib/time";
import { reportRange } from "@/lib/report";
import { formatKg, orderKg, reportTotals, type ReportItem, type ReportRow } from "@/lib/sales-report";
import { Alert, Button, ButtonLink, Card, EmptyState, Input, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Reports" };

const PICKS = [
  { range: "today", label: "Today" },
  { range: "week", label: "This week" },
  { range: "month", label: "This month" },
] as const;

// Orders that count as sales: confirmed onwards, not cancelled or rejected.
const SOLD = ["confirmed", "preparing", "ready", "completed"] as const;

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

// One row per order by its pickup or set-up date (business time zone): date, customer number, kilos, price.
export default async function SalesReportPage({ searchParams }: PageProps<"/admin/sales-report">) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const tz = await getBusinessTimezone();
  const today = zonedDayKey(new Date(), tz);
  const picked = str(params.range) ?? (params.from || params.to ? undefined : "month");
  const range = reportRange({ range: picked, from: str(params.from), to: str(params.to) }, today);

  let rows: ReportRow[] = [];
  let loadError: string | null = null;
  if (!range.error) {
    const supabase = await createClient();
    const start = zonedDayRange(range.from, tz).start;
    const end = zonedDayRange(range.to, tz).end;
    const { data: orders, error } = await supabase
      .from("order_summaries")
      .select("id, due_at, customer_phone, total_paise")
      .in("status", [...SOLD])
      .gte("due_at", start.toISOString())
      .lt("due_at", end.toISOString())
      .order("due_at")
      .limit(2000);
    if (error) loadError = error.message;
    const ids = (orders ?? []).map((o) => o.id).filter((v): v is string => Boolean(v));
    const [{ data: items }, { data: cakes }] = ids.length
      ? await Promise.all([
          supabase.from("order_items").select("order_id, variant_name, quantity, cancelled_quantity").in("order_id", ids),
          supabase.from("custom_cakes").select("order_id, weight_kg").in("order_id", ids),
        ])
      : [{ data: [] }, { data: [] }];
    const itemsByOrder = new Map<string, ReportItem[]>();
    for (const i of items ?? []) itemsByOrder.set(i.order_id, [...(itemsByOrder.get(i.order_id) ?? []), i]);
    const cakeKg = new Map((cakes ?? []).map((c) => [c.order_id, Number(c.weight_kg)]));
    rows = (orders ?? []).flatMap((o) =>
      o.id && o.due_at
        ? [{
            id: o.id,
            date: zonedDayKey(o.due_at, tz),
            phone: o.customer_phone,
            kg: orderKg(itemsByOrder.get(o.id) ?? [], cakeKg.get(o.id) ?? null),
            pricePaise: o.total_paise ?? 0,
          }]
        : [],
    );
  }
  const totals = reportTotals(rows);
  const period = range.from === range.to ? range.from : `${range.from} to ${range.to}`;

  return (
    <>
      <PageHeader title="Reports" />

      <div className="flex flex-col gap-6">
        <form className="flex flex-wrap items-end gap-3" role="search">
          <nav aria-label="Quick ranges" className="flex flex-wrap gap-2">
            {PICKS.map((p) => (
              <ButtonLink key={p.range} href={`/admin/sales-report?range=${p.range}`} variant={picked === p.range ? "primary" : "secondary"}>
                {p.label}
              </ButtonLink>
            ))}
          </nav>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sr-from" className="text-sm font-medium">From</label>
            <Input id="sr-from" type="date" name="from" defaultValue={range.from} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sr-to" className="text-sm font-medium">To</label>
            <Input id="sr-to" type="date" name="to" defaultValue={range.to} required />
          </div>
          <Button type="submit" variant="secondary">Show</Button>
        </form>

        {range.error && <Alert tone="danger" title="Check the dates">{range.error}</Alert>}
        {loadError && <Alert tone="danger" title="Could not load the report">{loadError}</Alert>}

        {!range.error && !loadError && (
          rows.length === 0 ? (
            <EmptyState title={`No orders for ${period}`}>Confirmed orders appear here on their pickup or set-up date.</EmptyState>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <caption className="px-4 pt-4 text-left font-display text-lg">{period}</caption>
                <thead>
                  <tr className="border-b border-line text-left text-muted">
                    <th scope="col" className="px-4 py-2 font-medium">Date</th>
                    <th scope="col" className="px-4 py-2 font-medium">Customer number</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">Kg</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-line">
                      <td className="px-4 py-2 tabular-nums">{r.date}</td>
                      <td className="px-4 py-2 tabular-nums">{r.phone ?? "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatKg(r.kg)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatPaise(r.pricePaise)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <th scope="row" colSpan={2} className="px-4 py-3 text-left">Total ({rows.length} orders)</th>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKg(totals.kg)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPaise(totals.pricePaise)}</td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          )
        )}
      </div>
    </>
  );
}
