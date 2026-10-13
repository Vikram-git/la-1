import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getBusinessTimezone } from "@/lib/settings";
import { cakeExtras } from "@/lib/custom-cake";
import { formatPaise } from "@/lib/money";
import { sourceLabel } from "@/lib/orders";
import { formatDateTime } from "@/lib/time";
import { PrintControls } from "../../print-controls";

export const metadata: Metadata = { title: "Cake sheet" };

// The custom cake's details for whoever bakes and decorates it (owner, 2026-10-09). The id is the order's.
export default async function CakeSheetPage({ params, searchParams }: PageProps<"/print/cake/[id]">) {
  await requireRole(["admin", "counter"]);
  const { id } = await params;
  const { size: sizeParam } = await searchParams;
  const size = sizeParam === "a4" ? "a4" : "80mm";
  if (!z.uuid().safeParse(id).success) notFound();
  const tz = await getBusinessTimezone();

  const supabase = await createClient();
  const [{ data: order }, { data: cake }] = await Promise.all([
    supabase
      .from("order_summaries")
      .select("reference, source, status, customer_name, customer_phone, due_at, fulfilment, setup_address, setup_note, total_paise, balance_paise")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("custom_cakes").select("*").eq("order_id", id).maybeSingle(),
  ]);
  if (!order || !cake) notFound();
  const photoUrl = cake.photo_path
    ? (await supabase.storage.from("custom-cake-photos").createSignedUrl(cake.photo_path, 600)).data?.signedUrl ?? null
    : null;
  const narrow = size === "80mm";

  const rows: [string, string | null][] = [
    ["Flavour", cake.flavour],
    ["Size", `${Number(cake.weight_kg)} kg${cake.tiers > 1 ? ` · ${cake.tiers} tiers` : ""}`],
    ["Egg", cake.is_eggless ? "EGGLESS" : "With egg"],
    ["Theme", cake.theme],
    ["Design", cake.design],
    ["Model", cake.model],
    ["Fondant", cake.fondant],
    ["Cream", cake.cream],
    ["Filling", cake.filling],
    ["Toppings", cake.toppings],
    ["Extras", cakeExtras(cake) || null],
    ["Instructions", cake.instructions],
  ];

  return (
    <div className="min-h-screen bg-canvas print:bg-white">
      <style>{`@page { size: ${narrow ? "80mm auto" : "A4"}; margin: ${narrow ? "3mm" : "12mm"}; }`}</style>
      <PrintControls basePath={`/print/cake/${id}`} size={size} />
      <article className={narrow
        ? "mx-auto w-[76mm] bg-white p-3 font-mono text-[11px] leading-snug text-black shadow print:w-full print:p-0 print:shadow-none"
        : "mx-auto max-w-3xl bg-white p-10 text-base text-black shadow print:max-w-none print:p-0 print:shadow-none"}>
        <header className={narrow ? "border-b border-dashed border-black pb-1 text-center" : "flex items-start justify-between gap-6 border-b-2 border-black pb-3"}>
          <div>
            <p className={narrow ? "font-sans text-sm font-bold" : "font-sans text-2xl font-bold"}>CUSTOM CAKE</p>
            <p>Order {order.reference} · {order.source ? sourceLabel[order.source] : ""}</p>
          </div>
          <div className={narrow ? "" : "text-right"}>
            <p className="font-bold">
              {order.fulfilment === "setup" ? "SET UP" : "PICKUP"}: {order.due_at ? formatDateTime(order.due_at, tz) : "—"}
            </p>
            <p>{order.customer_name} {order.customer_phone && `· ${order.customer_phone}`}</p>
          </div>
        </header>

        {order.fulfilment === "setup" ? (
          <p className="mt-2 font-bold">
            SET UP at: {order.setup_address}
            {order.setup_note && <span className="block font-normal">{order.setup_note}</span>}
          </p>
        ) : (
          <p className="mt-2 font-bold">COLLECT from store</p>
        )}

        {cake.message && (
          <p className={narrow ? "mt-2 border-y border-dashed border-black py-1 text-center text-sm font-bold" : "mt-4 border-2 border-black p-3 text-center text-2xl font-bold"}>
            “{cake.message}”
          </p>
        )}

        <dl className={narrow ? "mt-2" : "mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2"}>
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className={narrow ? "flex gap-2" : "contents"}>
                <dt className={narrow ? "shrink-0" : "font-semibold"}>{k}:</dt>
                <dd className={k === "Egg" && cake.is_eggless ? "font-bold" : ""}>{v}</dd>
              </div>
            ))}
        </dl>

        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage
          <img src={photoUrl} alt="Customer's reference photo" className={narrow ? "mt-2 w-full" : "mt-6 max-h-[110mm] w-auto"} />
        )}

        <footer className={narrow ? "mt-2 border-t border-dashed border-black pt-1" : "mt-6 border-t border-black pt-2 text-sm"}>
          Price {formatPaise(order.total_paise ?? 0)} · {(order.balance_paise ?? 0) > 0 ? `Balance due ${formatPaise(order.balance_paise ?? 0)}` : "Paid"}
        </footer>
      </article>
    </div>
  );
}
