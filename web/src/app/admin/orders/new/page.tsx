import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBusinessTimezone } from "@/lib/settings";
import { addDays, dateToZonedLocal, zonedDayKey } from "@/lib/time";
import { EmptyState, PageHeader } from "@/components/ui";
import { loadCatalogue } from "@/lib/catalogue";
import { OrderEntry } from "./order-entry";

export const metadata: Metadata = { title: "New order" };

const TITLES = { IN_STORE: "New in-store order", CALL: "New call order", CUSTOMER: "New customer order" } as const;
const SWITCH_LABEL = { IN_STORE: "in-store", CALL: "call", CUSTOMER: "customer" } as const;

export default async function NewOrderPage({ searchParams }: PageProps<"/admin/orders/new">) {
  const staff = await requireRole(["admin", "counter"]);
  const { source: sourceParam } = await searchParams;
  const source = sourceParam === "CALL" || sourceParam === "CUSTOMER" ? sourceParam : "IN_STORE";
  const tz = await getBusinessTimezone();

  const supabase = await createClient();
  const catalogue = await loadCatalogue(supabase);

  const tomorrow = addDays(zonedDayKey(new Date(), tz), 1);

  return (
    <>
      <PageHeader
        title={TITLES[source]}
        description={
          <>
            <Link href="/admin/orders" className="text-brand hover:underline">Orders</Link> / New · Switch to{" "}
            {(["IN_STORE", "CALL", "CUSTOMER"] as const)
              .filter((s) => s !== source)
              .map((s, i) => (
                <span key={s}>
                  {i > 0 && " or "}
                  <Link href={`/admin/orders/new?source=${s}`} className="text-brand hover:underline">{SWITCH_LABEL[s]}</Link>
                </span>
              ))}
          </>
        }
      />
      {catalogue.length === 0 ? (
        <EmptyState title="No products available to order">
          Add products with at least one available variant in <Link href="/admin/products" className="text-brand underline">Products</Link>.
        </EmptyState>
      ) : (
        <OrderEntry
          key={source}
          source={source}
          catalogue={catalogue}
          canConfirm={staff.role === "admin" || source === "IN_STORE"}
          isAdmin={staff.role === "admin"}
          defaultDueLocal={`${tomorrow}T11:00`}
          minDueLocal={dateToZonedLocal(new Date(), tz)}
        />
      )}
    </>
  );
}
