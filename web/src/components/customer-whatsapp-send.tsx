"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, cx } from "@/components/ui";
import { sendBillAndTermsAction } from "@/app/admin/orders/actions";

type Format = "pdf" | "png";

function shownNumber(phone: string): string {
  const local = phone.startsWith("91") && phone.length === 12 ? phone.slice(2) : phone;
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

// The bill and the Terms and Conditions straight to the customer's WhatsApp (owner, 2026-11-07): the number the
// customer gave on the order is their WhatsApp number; the admin picks image or PDF and taps once. The server
// sends both through WhatsApp Business, so nothing opens on this device and nothing is attached by hand.
export function CustomerWhatsAppSend({ orderId, phone, testMode }: { orderId: string; phone: string | null; testMode: boolean }) {
  const router = useRouter();
  const [format, setFormat] = useState<Format>("png");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setDone(null);
    setError(null);
    const r = await sendBillAndTermsAction({ orderId, format }).catch(() => null);
    setSending(false);
    const kind = format === "pdf" ? "PDF" : "image";
    if (r?.ok) {
      setDone(testMode
        ? `Bill and Terms sent as ${kind}s to the local WhatsApp test phone. Open http://localhost:4010 to see them.`
        : `Bill and Terms sent as ${kind}s to the customer's WhatsApp.`);
      for (const ms of [2500, 6000]) setTimeout(() => router.refresh(), ms);
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
        {sending ? "Sending…" : `Send bill and Terms on WhatsApp (${format === "pdf" ? "PDF" : "PNG"})`}
      </button>
      <p className="text-xs text-muted">Both go straight to the customer&rsquo;s WhatsApp chat as files. Nothing opens here; nothing to attach.</p>
      {done && <Alert tone="ok">{done}</Alert>}
      {error && <Alert tone="warn">{error}</Alert>}
    </div>
  );
}
