"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, cx } from "@/components/ui";
import { sendBillAndTermsAction } from "@/app/admin/orders/actions";

type Format = "pdf" | "png";

export type WhatsAppJob = { id: string; document: string; format: string; status: string; problem: string | null; created_at: string };

function shownNumber(phone: string): string {
  const local = phone.startsWith("91") && phone.length === 12 ? phone.slice(2) : phone;
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

const STATUS: Record<string, { text: string; tone: string }> = {
  pending: { text: "waiting for the shop computer…", tone: "text-muted" },
  sending: { text: "sending…", tone: "text-muted" },
  sent: { text: "✓ sent to the customer's WhatsApp", tone: "text-ok" },
  failed: { text: "not sent", tone: "text-danger" },
};

// The bill and the Terms and Conditions straight into the customer's WhatsApp chat as files (owner, 2026-11-07):
// the number the customer gave on the order is their WhatsApp; the admin picks image or PDF and taps once.
// Sent through WhatsApp Business when it is set up, otherwise by the shop computer's sender, linked to the
// bakery's WhatsApp (npm start in whatsapp-sender). Nothing opens on this device and nothing is attached by hand.
export function CustomerWhatsAppSend({ orderId, phone, testMode, cloud, jobs, senderOnline, senderPhone }: {
  orderId: string;
  phone: string | null;
  testMode: boolean;
  cloud: boolean;
  jobs: WhatsAppJob[];
  senderOnline: boolean;
  senderPhone: string | null;
}) {
  const router = useRouter();
  const [format, setFormat] = useState<Format>("png");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const waiting = jobs.some((j) => j.status === "pending" || j.status === "sending");

  // While files wait for the shop computer, check every 3 seconds.
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [waiting, router]);

  async function send() {
    setSending(true);
    setDone(null);
    setError(null);
    const r = await sendBillAndTermsAction({ orderId, format }).catch(() => null);
    setSending(false);
    const kind = format === "pdf" ? "PDFs" : "images";
    if (r?.ok) {
      if (r.queued) setDone(`Bill and Terms (${kind}) are on their way to the customer's WhatsApp from the shop computer.`);
      else {
        setDone(testMode
          ? `Bill and Terms sent as ${kind} to the local WhatsApp test phone. Open http://localhost:4010 to see them.`
          : `Bill and Terms sent as ${kind} to the customer's WhatsApp.`);
        for (const ms of [2500, 6000]) setTimeout(() => router.refresh(), ms);
      }
    } else setError(r?.message ?? "Could not send on WhatsApp. Check the connection and try again.");
    router.refresh();
  }

  if (!phone) return <p className="text-sm text-muted">Add the customer&rsquo;s phone number to the order to send on WhatsApp.</p>;

  return (
    <div className="flex flex-col gap-3">
      {testMode && (
        <Alert tone="warn" title="WhatsApp test mode">
          Sends go to the local WhatsApp test phone at http://localhost:4010, never to the customer.
        </Alert>
      )}
      {!cloud && (
        senderOnline ? (
          <p className="text-sm text-ok">● Shop computer is connected to WhatsApp{senderPhone ? ` (${shownNumber(senderPhone)})` : ""}.</p>
        ) : (
          <Alert tone="warn" title="Shop computer is not connected">
            Start the WhatsApp sender on the shop computer. Files you send now go out as soon as it is running (within 2 hours).
          </Alert>
        )
      )}
      <p className="text-sm">
        To the customer&rsquo;s WhatsApp: <span className="font-semibold tabular-nums">{shownNumber(phone)}</span>
      </p>
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="mb-1 text-sm text-muted">Send as</legend>
        {(["png", "pdf"] as const).map((f) => (
          <label
            key={f}
            className={cx(
              "cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium has-focus-visible:ring-4 has-focus-visible:ring-brand/15",
              format === f ? "border-brand bg-brand-soft text-brand-strong" : "border-line bg-surface hover:bg-brand-soft",
            )}
          >
            <input type="radio" name={`customer-send-${orderId}`} value={f} checked={format === f} onChange={() => setFormat(f)} className="sr-only" />
            {f === "pdf" ? "PDF" : "Image (PNG)"}
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        onClick={send}
        disabled={sending}
        className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[#1f9d55] px-5 py-2.5 text-base font-semibold text-white shadow-sm shadow-[#1f9d55]/25 transition-colors hover:bg-[#14713c] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? "Preparing…" : `Send bill and Terms on WhatsApp (${format === "pdf" ? "PDF" : "PNG"})`}
      </button>
      <p className="text-xs text-muted">Both go straight into the customer&rsquo;s WhatsApp chat as files. Nothing opens here; nothing to attach.</p>
      {jobs.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {jobs.map((j) => (
            <li key={j.id} className={STATUS[j.status]?.tone}>
              {j.document === "bill" ? "Bill" : "Terms"} ({j.format.toUpperCase()}): {STATUS[j.status]?.text ?? j.status}
              {j.problem && <span className="block text-xs text-muted">{j.problem}</span>}
            </li>
          ))}
        </ul>
      )}
      {done && <Alert tone="ok">{done}</Alert>}
      {error && <Alert tone="warn">{error}</Alert>}
    </div>
  );
}
