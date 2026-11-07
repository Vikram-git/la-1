import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { makeQuotationFile } from "@/lib/quotation-send";
import { renderTermsPdf, renderTermsPng, termsFileName } from "@/lib/terms-file";
import { whatsappNumber } from "@/lib/whatsapp";
import type { CloudFormat } from "@/lib/whatsapp-cloud";

type Client = SupabaseClient<Database>;

export type QueueOutcome = { ok: true } | { ok: false; message: string };

// The shop computer's sender is "online" while it reported in the last 45 seconds and is linked to WhatsApp.
export const SENDER_FRESH_MS = 45_000;

export function senderOnline(sender: { last_seen: string | null; state: string | null } | null, now = Date.now()): boolean {
  return Boolean(sender?.last_seen && sender.state === "connected" && now - new Date(sender.last_seen).getTime() < SENDER_FRESH_MS);
}

// What the send card shows: this order's latest files and whether the shop computer is connected.
export async function loadWhatsAppSendState(supabase: Client, orderId: string) {
  const [{ data: jobs }, { data: sender }] = await Promise.all([
    supabase.from("whatsapp_jobs").select("id, document, format, status, problem, created_at").eq("order_id", orderId).order("created_at", { ascending: false }).limit(4),
    supabase.from("whatsapp_sender").select("last_seen, state, linked_phone").eq("id", 1).maybeSingle(),
  ]);
  return { jobs: jobs ?? [], senderOnline: senderOnline(sender), senderPhone: sender?.linked_phone ?? null };
}

// Makes the bill and the Terms in the chosen format, stores them privately and queues both for the shop
// computer's WhatsApp sender, addressed to the number the customer gave (owner, 2026-11-07). Captions carry
// the order number, never the customer's name.
export async function queueBillAndTerms(supabase: Client, orderId: string, format: CloudFormat): Promise<QueueOutcome> {
  const { data: order, error } = await supabase.from("orders").select("reference, customer_phone").eq("id", orderId).maybeSingle();
  if (error || !order?.reference) return { ok: false, message: "Order not found." };
  const to = whatsappNumber(order.customer_phone);
  if (!to) return { ok: false, message: "The order has no phone number for the customer." };
  const reference = order.reference;

  const bill = await makeQuotationFile(supabase, orderId, format);
  if (!bill.ok) return { ok: false, message: bill.message };

  let termsFile: Buffer;
  try {
    termsFile = format === "pdf" ? await renderTermsPdf(reference) : await renderTermsPng(reference);
  } catch (e) {
    console.error("terms render failed", format, e);
    return { ok: false, message: "Could not make the Terms file. Try again." };
  }
  const termsPath = `${orderId}/terms-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}.${format}`;
  const upload = await supabase.storage
    .from("quotations")
    .upload(termsPath, termsFile, { contentType: format === "pdf" ? "application/pdf" : "image/png", upsert: false });
  if (upload.error) {
    console.error("terms upload failed", upload.error.message);
    return { ok: false, message: "Could not save the Terms file. Try again." };
  }

  const { error: queueError } = await supabase.from("whatsapp_jobs").insert([
    { order_id: orderId, to_phone: to, document: "bill", format, file_path: bill.path, file_name: bill.fileName, caption: `La Patisserie Madras · Bill for order ${reference}` },
    { order_id: orderId, to_phone: to, document: "terms", format, file_path: termsPath, file_name: termsFileName(reference, format), caption: `La Patisserie Madras · Terms and Conditions for order ${reference}` },
  ]);
  if (queueError) {
    console.error("whatsapp jobs not queued", queueError.code, queueError.message);
    return { ok: false, message: "Could not queue the WhatsApp message. Try again." };
  }
  return { ok: true };
}
