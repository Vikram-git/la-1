"use client";

import { Field, Input, cx } from "@/components/ui";
import type { Fulfilment } from "@/lib/orders";

export type FulfilmentValue = { fulfilment: Fulfilment; address: string; note: string };

// Collect from the store (green) or set up at the customer's place (red), with the address for set-up.
// Used by every order form and by the order page's "Change" form.
export function FulfilmentFields({
  value,
  onChange,
  idPrefix = "fulfil",
}: {
  value: FulfilmentValue;
  onChange: (value: FulfilmentValue) => void;
  idPrefix?: string;
}) {
  const option = (f: Fulfilment, label: string, icon: string, tone: string, active: string) => (
    <label
      className={cx(
        "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold",
        value.fulfilment === f ? active : "border-line bg-surface text-muted hover:border-brand/40",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
      )}
    >
      <input
        type="radio"
        name={`${idPrefix}-type`}
        className="sr-only"
        checked={value.fulfilment === f}
        onChange={() => onChange({ ...value, fulfilment: f })}
      />
      <span aria-hidden>{icon}</span>
      <span className={value.fulfilment === f ? tone : undefined}>{label}</span>
    </label>
  );

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Pickup/Cab or set up" className="flex flex-wrap gap-3">
        {option("collect", "Pickup/Cab", "🏪", "text-ok", "border-ok bg-ok-soft")}
        {option("setup", "Set up at customer's place", "🚚", "text-danger", "border-danger bg-danger-soft")}
      </div>
      {value.fulfilment === "setup" && (
        <div className="grid gap-3 rounded-xl border border-danger/30 bg-danger-soft/40 p-3">
          <Field label="Set-up address" htmlFor={`${idPrefix}-address`}>
            <Input
              id={`${idPrefix}-address`}
              value={value.address}
              onChange={(e) => onChange({ ...value, address: e.target.value })}
              maxLength={300}
              required
              autoComplete="off"
              placeholder="House / hall, street, area"
            />
          </Field>
          <Field label="Landmark or contact at the venue (optional)" htmlFor={`${idPrefix}-note`}>
            <Input
              id={`${idPrefix}-note`}
              value={value.note}
              onChange={(e) => onChange({ ...value, note: e.target.value })}
              maxLength={300}
              autoComplete="off"
            />
          </Field>
        </div>
      )}
    </div>
  );
}
