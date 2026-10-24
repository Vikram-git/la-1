"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input } from "@/components/ui";
import { deleteOrderAction } from "../orders/actions";

// Admin only: delete an order from the calendar, with a reason. Orders with an advance, refund or bill
// are cancelled instead so their money records stay.
export function DeleteOrderButton({ orderId, reference }: { orderId: string; reference: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function close() {
    dialog.current?.close();
    setReason("");
    setError(null);
  }

  function submit() {
    setError(null);
    start(async () => {
      const r = await deleteOrderAction({ orderId, reason }).catch(() => null);
      if (r?.ok) {
        close();
        if (r.outcome === "cancelled") window.alert(`${reference} has payments, so it was cancelled instead of deleted. Refund the advance from the order page if needed.`);
        router.refresh();
      } else {
        setError(r?.message ?? "Could not delete the order. Check the connection and try again.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="relative z-10 rounded-lg border border-danger/40 bg-surface px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger-soft"
        aria-label={`Delete order ${reference}`}
      >
        Delete
      </button>
      <dialog
        ref={dialog}
        onClose={() => { setReason(""); setError(null); }}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-5 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <h2 className="font-display text-lg font-semibold">Delete order {reference}?</h2>
        <p className="mt-1 text-sm text-muted">
          It is removed from the calendar, the order list and the kitchen. An order with an advance or a bill is cancelled instead, so the money records stay.
        </p>
        <Field label="Reason" htmlFor={`delete-reason-${orderId}`} className="mt-4">
          <Input
            id={`delete-reason-${orderId}`}
            value={reason}
            onChange={(e) => { setError(null); setReason(e.target.value); }}
            maxLength={300}
            autoFocus
            placeholder="e.g. Customer called it off"
          />
        </Field>
        {error && <div className="mt-3"><Alert tone="danger">{error}</Alert></div>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={close} disabled={pending}>Keep order</Button>
          <Button variant="danger" onClick={submit} disabled={pending || reason.trim().length < 3}>
            {pending ? "Deleting…" : "Delete order"}
          </Button>
        </div>
      </dialog>
    </>
  );
}
