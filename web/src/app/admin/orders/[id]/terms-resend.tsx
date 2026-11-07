"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { sendTermsAction } from "../actions";

// The server sends the Terms (PDF and image) to the customer's WhatsApp again; nothing is shared by hand.
export function TermsResend({ orderId, label }: { orderId: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);

  function send() {
    setProblem(null);
    start(async () => {
      let result: { ok?: boolean; message?: string };
      try {
        result = await sendTermsAction({ orderId });
      } catch {
        result = { message: "Not sent, check the connection." };
      }
      if (!result.ok) setProblem(result.message ?? "Something went wrong.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="secondary" disabled={pending} onClick={send}>{pending ? "Sending…" : label}</Button>
      {problem && <p className="text-sm text-warn">{problem}</p>}
    </div>
  );
}
