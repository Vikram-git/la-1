import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadQuotation } from "@/lib/quotation-server";
import { quotationFileName, quotationView } from "@/lib/quotation";
import { renderQuotationPdf } from "@/lib/quotation-pdf";
import { renderQuotationPng } from "@/lib/quotation-png";

// Signed links to the stored file last this long; the file itself stays private.
const LINK_SECONDS = 300;

const body = z.object({ format: z.enum(["pdf", "png"]).default("pdf") });

// Makes the customer's quotation file, fresh from the order as it is now, for admin and counter staff.
// Chefs get 403 here: the price-free version is never made into a file for a customer.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/orders/[id]/quotation">) {
  const staff = await getStaff();
  if (!staff) return Response.json({ ok: false, message: "Sign in again." }, { status: 401 });
  if (staff.role !== "admin" && staff.role !== "counter") {
    return Response.json({ ok: false, message: "Only admin and counter staff can send quotations." }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ ok: false, message: "Order not found." }, { status: 404 });
  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ ok: false, message: "Choose PDF or image." }, { status: 400 });
  const { format } = parsed.data;

  const supabase = await createClient();
  const result = await loadQuotation(supabase, id);
  if (!result.ok) return Response.json({ ok: false, message: result.message }, { status: result.status });
  // Belt and braces: only the full version (with amounts) is ever made into a customer's file.
  if (result.quotation.mode !== "full" || !result.quotation.amounts) {
    return Response.json({ ok: false, message: "Only the full quotation can be sent." }, { status: 403 });
  }

  const view = quotationView(result.quotation);
  let file: Buffer;
  try {
    file = format === "pdf" ? await renderQuotationPdf(view) : await renderQuotationPng(view);
  } catch (e) {
    console.error("quotation render failed", format, e);
    return Response.json({ ok: false, message: "Could not make the quotation file. Try again." }, { status: 500 });
  }

  const contentType = format === "pdf" ? "application/pdf" : "image/png";
  const path = `${id}/${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}.${format}`;
  const upload = await supabase.storage.from("quotations").upload(path, file, { contentType, upsert: false });
  if (upload.error) {
    console.error("quotation upload failed", upload.error.message);
    return Response.json({ ok: false, message: "Could not save the quotation file. Try again." }, { status: 500 });
  }
  const fileName = quotationFileName(result.quotation.order.reference, format);
  const { data: signed, error: signError } = await supabase.storage.from("quotations").createSignedUrl(path, LINK_SECONDS, { download: fileName });
  if (signError || !signed) {
    console.error("quotation signed link failed", signError?.message);
    return Response.json({ ok: false, message: "Could not open the quotation file. Try again." }, { status: 500 });
  }

  return Response.json(
    { ok: true, path, fileName, contentType, url: signed.signedUrl, expiresIn: LINK_SECONDS },
    { headers: { "Cache-Control": "no-store" } },
  );
}
