import { whatsappLink } from "@/lib/whatsapp";

export type ShareChannel = "share_sheet" | "download_and_chat";

export function canShareFile(file: File): boolean {
  return typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Sends a file to the customer's WhatsApp from this device (owner, 2026-11-07): phones get the share sheet
// with the file attached; computers, or any device where sharing fails, download the file and open the
// customer's chat to attach it. Must run straight after a tap. Returns null when the staff member cancels.
export async function shareFileToWhatsApp(file: File, phone: string | null, text = ""): Promise<ShareChannel | null> {
  if (canShareFile(file)) {
    try {
      await navigator.share(text ? { files: [file], text } : { files: [file] });
      return "share_sheet";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return null;
    }
  }
  download(file);
  window.open(whatsappLink(phone ?? "", text), "_blank", "noopener,noreferrer");
  return "download_and_chat";
}
