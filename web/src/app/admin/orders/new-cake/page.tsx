import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBusinessTimezone } from "@/lib/settings";
import { addDays, dateToZonedLocal, zonedDayKey } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { CakeOrderForm } from "./cake-form";

export const metadata: Metadata = { title: "New custom cake order" };

export default async function NewCakeOrderPage() {
  const staff = await requireRole(["admin", "counter"]);
  const tz = await getBusinessTimezone();
  const supabase = await createClient();
  const { data: settings } = await supabase.from("business_settings").select("custom_cake_tax_rate_bps").single();
  const tomorrow = addDays(zonedDayKey(new Date(), tz), 1);

  return (
    <>
      <PageHeader
        title="New custom cake order"
        description={
          <>
            <Link href="/admin/orders?list=custom" className="text-brand hover:underline">Orders</Link> / Custom cakes / New. The price
            includes GST at {(settings?.custom_cake_tax_rate_bps ?? 500) / 100}% (Shop Settings).
          </>
        }
      />
      <CakeOrderForm
        isAdmin={staff.role === "admin"}
        defaultDueLocal={`${tomorrow}T11:00`}
        minDueLocal={dateToZonedLocal(new Date(), tz)}
      />
    </>
  );
}
