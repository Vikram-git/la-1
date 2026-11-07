"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, cx } from "@/components/ui";
import { whatsappLink } from "@/lib/whatsapp";
import { sendTermsAction } from "@/app/admin/orders/actions";

type Format = "pdf" | "png";

// The Terms and Conditions for a cake order, sent the same way as the bill (owner, 2026-11-07): download
// the PDF or image, or send it to the customer's own WhatsApp chat. With WhatsApp Business set up, one tap
// and the server sends both files (cake orders also get them automatically on confirming). Otherwise the
// file goes from this device: phones get the share sheet, computers download it and open the customer's
// chat to attach it. Two taps on purpose: browsers allow sharing only straight after a tap.
export function TermsPanel({ orderId, reference, phone, cloud }: { orderId: string; reference: string; phone: string | null; cloud: boolean }) {
  const router = useRouter();
  const [format, setFormat] = useState<Format>("png");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const url = (f: Format) => `/api/terms?${new URLSearchParams({ format: f, ref: reference })}`;
  const canShareFile = (f: File) => typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [f] });
  const green = "bg-[#1f9d55] text-white shadow-sm shadow-[#1f9d55]/25 hover:bg-[#14713c]";
  const button = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

  async function sendNow() {
    setSending(true);
    setError(null);
    setDone(null);
    const r = await sendTermsAction({ orderId }).catch(() => null);
    setSending(false);
    if (r?.ok) setDone("Sent to the customer on WhatsApp (PDF and image).");
    else setError(r?.message ?? "Could not send on WhatsApp. Check the connection and try again.");
    router.refresh();
  }

  async function prepare() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch(url(format));
      if (!res.ok) throw new Error();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `Terms.${format}`;
      const blob = await res.blob();
      setFile(new File([blob], name, { type: blob.type }));
    } catch {
      setError("Could not make the Terms file. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!file) return;
    setError(null);
    if (canShareFile(file)) {
      try {
        await navigator.share({ files: [file] });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError("Sharing did not work on this device. Use the download instead.");
        return;
      }
      setDone("Shared.");
    } else {
      const href = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = href;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 60_000);
      window.open(whatsappLink(phone ?? "", ""), "_blank", "noopener,noreferrer");
      setDone(`${file.name} downloaded and the customer's WhatsApp chat opened. Attach the file there, then press send.`);
    }
    setFile(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Download</span>
        <a href={url("pdf")} download className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-brand-strong hover:bg-brand-soft">PDF</a>
        <a href={url("png")} download className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-brand-strong hover:bg-brand-soft">Image (PNG)</a>
      </div>

      {!phone ? (
        <p className="text-sm text-muted">Add the customer&rsquo;s phone number to send the Terms on WhatsApp.</p>
      ) : (
        <>
          {cloud && (
            <div className="flex flex-col gap-2 rounded-xl border border-line bg-brand-soft/40 p-3">
              <button type="button" onClick={sendNow} disabled={sending || busy} className={cx(button, "self-start", green)}>
                {sending ? "Sending on WhatsApp…" : "Send Terms on WhatsApp now"}
              </button>
              <p className="text-xs text-muted">Sent straight to the customer from the bakery&rsquo;s WhatsApp Business number, as a PDF and an image.</p>
            </div>
          )}
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="mb-1 text-sm text-muted">{cloud ? "Or send it from this device as" : "Send as"}</legend>
            {(["pdf", "png"] as const).map((f) => (
              <label
                key={f}
                className={cx(
                  "cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium has-focus-visible:ring-4 has-focus-visible:ring-brand/15",
                  format === f ? "border-brand bg-brand-soft text-brand-strong" : "border-line bg-surface hover:bg-brand-soft",
                )}
              >
                <input type="radio" name="terms-format" value={f} checked={format === f} onChange={() => { setFormat(f); setFile(null); }} className="sr-only" />
                {f === "pdf" ? "PDF" : "Image (PNG)"}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap items-center gap-3">
            {file ? (
              <button type="button" onClick={send} className={cx(button, green)}>
                {canShareFile(file) ? "Share to WhatsApp" : "Download & open WhatsApp"}
              </button>
            ) : (
              <button type="button" onClick={prepare} disabled={busy || sending}
                className={cx(button, cloud ? "border border-line bg-surface text-ink hover:bg-brand-soft" : green)}>
                {busy ? `Preparing ${format === "pdf" ? "PDF" : "image"}…` : "Send Terms on WhatsApp"}
              </button>
            )}
            <p className="text-xs text-muted">
              {file ? `${file.name} is ready (${Math.max(1, Math.round(file.size / 1024))} KB).` : "Opens this customer's WhatsApp chat; no need to pick the contact."}
            </p>
          </div>
        </>
      )}
      {done && <Alert tone="ok">{done}</Alert>}
      {error && <Alert tone="warn">{error}</Alert>}
    </div>
  );
}
