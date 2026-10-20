"use client";

import { useState, useTransition } from "react";
import { cx } from "@/components/ui";
import { setItemKitchenAction } from "../actions";

// Which kitchen makes this item; it decides the chef screen it shows on. Saves on change.
export function ItemKitchen({
  orderId,
  itemId,
  kitchenId,
  kitchens,
}: {
  orderId: string;
  itemId: string;
  kitchenId: string | null;
  kitchens: { id: string; name: string }[];
}) {
  const [value, setValue] = useState(kitchenId ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const change = (next: string) => {
    const before = value;
    setValue(next);
    setError(null);
    start(async () => {
      const result = await setItemKitchenAction({ orderId, itemId, kitchenId: next || null });
      if (!result.ok) {
        setValue(before);
        setError(result.message ?? "Could not change the kitchen.");
      }
    });
  };

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor={`kitchen-${itemId}`} className="text-muted">Kitchen</label>
      <select
        id={`kitchen-${itemId}`}
        value={value}
        disabled={pending}
        onChange={(e) => change(e.target.value)}
        className={cx(
          "rounded-lg border bg-surface px-2 py-1 text-sm",
          value ? "border-line" : "border-warn/50 bg-warn-soft text-warn",
        )}
      >
        <option value="">Not set (every chef sees it)</option>
        {kitchens.map((k) => (
          <option key={k.id} value={k.id}>{k.name}</option>
        ))}
      </select>
      {pending && <span className="text-muted">Saving…</span>}
      {error && <span role="alert" className="text-danger">{error}</span>}
    </div>
  );
}
