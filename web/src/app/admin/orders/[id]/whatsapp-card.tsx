"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Textarea, cx } from "@/components/ui";
import { MESSAGE_LABEL, whatsappLink, type MessageKind } from "@/lib/whatsapp";
import { recordCustomerMessageAction } from "../actions";

// Ready-made WhatsApp messages for this order (2026-10-19). Staff can change the text, then open it in
// WhatsApp (app or web) and press send there. Opening one is recorded on the timeline.
export function WhatsAppCard({
  orderId,
  phone,
  messages,
  sentKinds,
}: {
  orderId: string;
  phone: string | null; // already in WhatsApp form (country code, digits only)
  messages: { kind: MessageKind; text: string }[];
  sentKinds: MessageKind[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<MessageKind | null>(messages[0]?.kind ?? null);
  const [texts, setTexts] = useState<Record<string, string>>(() => Object.fromEntries(messages.map((m) => [m.kind, m.text])));
  const [error, setError] = useState<string | null>(null);

  if (!phone) return <p className="text-sm text-muted">No usable phone number on this order.</p>;
  if (!kind) return <p className="text-sm text-muted">No message for an order in this state. Call the customer if needed.</p>;
  const text = texts[kind] ?? "";

  function open() {
    if (!phone || !kind) return;
    setError(null);
    // Open first, in the click itself, so the browser does not block the new tab.
    window.open(whatsappLink(phone, text), "_blank", "noopener,noreferrer");
    recordCustomerMessageAction({ orderId, kind })
      .then((r) => (r.ok ? router.refresh() : setError(r.message ?? "The message was opened but not recorded on the timeline.")))
      .catch(() => setError("The message was opened but not recorded on the timeline."));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Message">
        {messages.map((m) => (
          <button
            key={m.kind}
            type="button"
            role="tab"
            aria-selected={m.kind === kind}
            onClick={() => setKind(m.kind)}
            className={cx(
              "rounded-full border px-3 py-1.5 text-sm font-medium",
              m.kind === kind ? "border-[#1f9d55] bg-[#e7f6ed] text-[#14713c]" : "border-line bg-surface hover:bg-brand-soft",
            )}
          >
            {MESSAGE_LABEL[m.kind]}
            {sentKinds.includes(m.kind) && <span className="ml-1 text-xs text-muted">· opened before</span>}
          </button>
        ))}
      </div>
      <Textarea
        aria-label="Message text"
        rows={Math.min(14, text.split("\n").length + 2)}
        value={text}
        onChange={(e) => setTexts((t) => ({ ...t, [kind]: e.target.value }))}
        maxLength={2000}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={open} className="bg-[#1f9d55] shadow-[#1f9d55]/25 hover:bg-[#14713c]" disabled={!text.trim()}>
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35zM12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88zm8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42z"/></svg>
          Open in WhatsApp
        </Button>
        <p className="text-xs text-muted">Check the message, then press send in WhatsApp.</p>
      </div>
      {error && <Alert tone="warn">{error}</Alert>}
    </div>
  );
}
