"use client";

import { useState } from "react";
import { cx } from "@/components/ui";
import { whatsappLink } from "@/lib/whatsapp";

type Format = "png" | "pdf";

// Sends the Terms and Conditions as a file, not text (owner, 2026-10-28). Two taps, as with the Order in
// msg: the file is made first, and browsers allow sharing only straight after a tap. Phones get the share
// sheet with the file attached; computers download it and open the customer's WhatsApp chat to attach it.
export function TermsSend({ phone, reference, compact = false }: { phone: string; reference: string | null; compact?: boolean }) {
  const [format, setFormat] = useState<Format>("png");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);

  async function prepare() {
    setBusy(true);
    setNote(null);
    try {
      const params = new URLSearchParams({ format, ...(reference ? { ref: reference } : {}) });
      const res = await fetch(`/api/terms?${params}`);
      if (!res.ok) throw new Error();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `Terms.${format}`;
      const blob = await res.blob();
      setFile(new File([blob], name, { type: blob.type }));
    } catch {
      setNote({ tone: "warn", text: "Could not make the terms file. Check the connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!file) return;
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setNote({ tone: "warn", text: "Sharing did not work on this device." });
        return;
      }
      setNote({ tone: "ok", text: "Shared." });
    } else {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      window.open(whatsappLink(phone, ""), "_blank", "noopener,noreferrer");
      setNote({ tone: "ok", text: `${file.name} downloaded and WhatsApp opened. Attach it in the chat, then press send.` });
    }
    setFile(null);
  }

  const green = "bg-[#1f9d55] text-white shadow-sm shadow-[#1f9d55]/25 hover:bg-[#14713c]";
  const button = file ? (
    <button type="button" onClick={send} className={cx("inline-flex items-center justify-center font-medium transition-colors", green, compact ? "rounded-full px-3 py-1 text-xs" : "rounded-xl px-4 py-2 text-sm")}>
      {typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }) ? "Share Terms to WhatsApp" : "Download & open WhatsApp"}
    </button>
  ) : (
    <button
      type="button"
      onClick={prepare}
      disabled={busy}
      className={cx(
        "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        compact ? "rounded-full border border-line bg-surface px-3 py-1 text-xs text-brand-strong hover:bg-brand-soft" : cx("rounded-xl px-4 py-2 text-sm", green),
      )}
    >
      {busy ? "Preparing…" : compact ? "Terms and Conditions" : `Send Terms on WhatsApp (${format === "pdf" ? "PDF" : "image"})`}
    </button>
  );

  if (compact) {
    return (
      <span className="relative z-10 inline-flex flex-col items-start gap-1">
        {button}
        {note && <span className={cx("max-w-56 text-xs", note.tone === "ok" ? "text-ok" : "text-warn")}>{note.text}</span>}
      </span>
    );
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {(["png", "pdf"] as const).map((f) => (
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
        {button}
      </div>
      {note && <p className={cx("text-sm", note.tone === "ok" ? "text-ok" : "text-warn")}>{note.text}</p>}
    </div>
  );
}
