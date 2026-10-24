"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Textarea, cx } from "@/components/ui";
import { whatsappLink } from "@/lib/whatsapp";
import { recordQuotationSendAction } from "../actions";

type Format = "pdf" | "png";
type Prepared = { file: File; path: string; format: Format };

// "Send quotation on WhatsApp" (2026-10-24). No WhatsApp Cloud API is set up, so the file goes from this
// device: phones get the share sheet with the file attached (pick WhatsApp, then the chat); computers
// download the file and open the customer's WhatsApp chat with the message filled in, to attach it there.
// Two taps on purpose: browsers allow sharing or opening a tab only straight after a tap, and the file is
// made fresh on the server first.
export function QuotationSend({ orderId, phone, caption: initialCaption }: { orderId: string; phone: string | null; caption: string }) {
  const router = useRouter();
  const [format, setFormat] = useState<Format>("pdf");
  const [caption, setCaption] = useState(initialCaption);
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function prepare() {
    setBusy(true);
    setError(null);
    setDone(null);
    setPrepared(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/quotation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; url?: string; path?: string; fileName?: string; contentType?: string };
      if (!res.ok || !data.ok || !data.url || !data.path || !data.fileName) {
        setError(data.message ?? "Could not make the quotation file.");
        return;
      }
      const blob = await (await fetch(data.url)).blob();
      setPrepared({ file: new File([blob], data.fileName, { type: data.contentType ?? blob.type }), path: data.path, format });
    } catch {
      setError("Could not make the quotation file. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const canShareFile = (file: File) => typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

  async function send() {
    if (!prepared) return;
    setError(null);
    const { file, path } = prepared;
    let channel: "share_sheet" | "download_and_chat";
    if (canShareFile(file)) {
      // WhatsApp sometimes drops the text when a file is shared, so the message is also copied.
      navigator.clipboard?.writeText(caption).catch(() => {});
      try {
        await navigator.share({ files: [file], text: caption });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError("Sharing did not work on this device. Use the download instead.");
        return;
      }
      channel = "share_sheet";
    } else {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      window.open(whatsappLink(phone ?? "", caption), "_blank", "noopener,noreferrer");
      channel = "download_and_chat";
    }
    const r = await recordQuotationSendAction({ orderId, format: prepared.format, channel, path, caption }).catch(() => null);
    setPrepared(null);
    setDone(
      channel === "share_sheet"
        ? "Shared. The message was also copied — paste it in WhatsApp if it is missing."
        : `${file.name} downloaded and WhatsApp opened. Attach the file in the chat, then press send.`,
    );
    if (!r?.ok) setError(r?.message ?? "Sent, but not recorded on the order.");
    else router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="mb-1 text-sm text-muted">Send as</legend>
        {(["pdf", "png"] as const).map((f) => (
          <label
            key={f}
            className={cx(
              "cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium has-focus-visible:ring-4 has-focus-visible:ring-brand/15",
              format === f ? "border-brand bg-brand-soft text-brand-strong" : "border-line bg-surface hover:bg-brand-soft",
            )}
          >
            <input
              type="radio"
              name="quotation-format"
              value={f}
              checked={format === f}
              onChange={() => {
                setFormat(f);
                setPrepared(null);
              }}
              className="sr-only"
            />
            {f === "pdf" ? "PDF" : "Image (PNG)"}
          </label>
        ))}
      </fieldset>
      <Textarea
        aria-label="Message sent with the quotation"
        rows={Math.min(10, caption.split("\n").length + 1)}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        maxLength={2000}
      />
      <div className="flex flex-wrap items-center gap-3">
        {prepared ? (
          <button
            type="button"
            onClick={send}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f9d55] px-4 py-2 text-sm font-medium text-white shadow-sm shadow-[#1f9d55]/25 transition-colors hover:bg-[#14713c]"
          >
            {canShareFile(prepared.file) ? "Share to WhatsApp" : "Download & open WhatsApp"}
          </button>
        ) : (
          <button
            type="button"
            onClick={prepare}
            disabled={busy || !caption.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f9d55] px-4 py-2 text-sm font-medium text-white shadow-sm shadow-[#1f9d55]/25 transition-colors hover:bg-[#14713c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? `Preparing ${format === "pdf" ? "PDF" : "image"}…` : "Send quotation on WhatsApp"}
          </button>
        )}
        <p className="text-xs text-muted">
          {prepared ? `${prepared.file.name} is ready (${Math.max(1, Math.round(prepared.file.size / 1024))} KB).` : "The file is made fresh from the order as it is now."}
        </p>
      </div>
      {done && <Alert tone="ok">{done}</Alert>}
      {error && <Alert tone="warn">{error}</Alert>}
    </div>
  );
}
