import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadQuotation } from "@/lib/quotation-server";
import { quotationView, withoutPrices } from "@/lib/quotation";
import { QuotationSheet } from "@/components/quotation-sheet";
import { PrintButton } from "@/app/print/print-button";

export const metadata: Metadata = { title: "Order in msg (kitchen)" };

// The price-free quotation for the kitchen. Chefs get only confirmed orders of their own kitchen (the
// database refuses the rest); admins and counter staff opening it see the same price-free version.
export default async function KitchenQuotationPage({ params }: PageProps<"/kitchen/quotation/[id]">) {
  await requireRole(["chef", "admin", "counter"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const result = await loadQuotation(await createClient(), id);
  if (!result.ok) notFound();
  const view = quotationView(withoutPrices(result.quotation));

  return (
    <div className="min-h-screen bg-canvas px-4 py-6 sm:py-10 print:bg-white print:p-0">
      <style>{"@page { size: A4; margin: 14mm; }"}</style>
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 print:hidden">
        <Link href="/kitchen" className="text-sm font-medium text-brand-strong hover:underline">← Kitchen</Link>
        <PrintButton />
      </div>
      <QuotationSheet view={view} />
    </div>
  );
}
