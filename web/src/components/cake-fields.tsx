"use client";

import { Checkbox, Field, Input, Textarea } from "@/components/ui";

export type CakeFormValue = {
  flavour: string;
  weightKg: string;
  tiers: string;
  theme: string;
  design: string;
  model: string;
  fondant: string;
  cream: string;
  filling: string;
  toppings: string;
  message: string;
  isEggless: boolean;
  instructions: string;
  hasCupcakes: boolean;
  hasPopsicles: boolean;
  setupCharge: string; // rupees
  deliveryCharge: string; // rupees
};

export const EMPTY_CAKE: CakeFormValue = {
  flavour: "",
  weightKg: "1",
  tiers: "1",
  theme: "",
  design: "",
  model: "",
  fondant: "",
  cream: "",
  filling: "",
  toppings: "",
  message: "",
  isEggless: false,
  instructions: "",
  hasCupcakes: false,
  hasPopsicles: false,
  setupCharge: "",
  deliveryCharge: "",
};

// The custom cake's details: the new custom cake order form and the order page's edit card.
export function CakeFields({
  value,
  onChange,
  idPrefix = "cake",
}: {
  value: CakeFormValue;
  onChange: (value: CakeFormValue) => void;
  idPrefix?: string;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const text = (key: keyof CakeFormValue, label: string, max: number, placeholder?: string) => (
    <Field label={label} htmlFor={id(key)}>
      <Input
        id={id(key)}
        value={value[key] as string}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        maxLength={max}
        placeholder={placeholder}
        autoComplete="off"
      />
    </Field>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Flavour" htmlFor={id("flavour")}>
        <Input
          id={id("flavour")}
          value={value.flavour}
          onChange={(e) => onChange({ ...value, flavour: e.target.value })}
          maxLength={80}
          required
          autoComplete="off"
          placeholder="e.g. Chocolate truffle"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Weight (kg)" htmlFor={id("weight")}>
          <Input
            id={id("weight")}
            type="number"
            inputMode="decimal"
            min={0.25}
            max={50}
            step={0.25}
            value={value.weightKg}
            onChange={(e) => onChange({ ...value, weightKg: e.target.value })}
            required
          />
        </Field>
        <Field label="Tiers" htmlFor={id("tiers")}>
          <Input
            id={id("tiers")}
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            step={1}
            value={value.tiers}
            onChange={(e) => onChange({ ...value, tiers: e.target.value })}
            required
          />
        </Field>
      </div>
      {text("theme", "Theme", 200, "e.g. Unicorn, Frozen")}
      {text("design", "Design", 200, "e.g. Gold drip, floral")}
      {text("model", "Model", 200, "e.g. Doll cake, number 5")}
      {text("fondant", "Fondant", 80, "e.g. Full fondant, semi fondant")}
      {text("cream", "Cream", 80, "e.g. Whipped, buttercream")}
      {text("filling", "Filling", 80, "e.g. Ganache")}
      {text("toppings", "Toppings", 200, "e.g. Sprinkles, fresh fruit")}
      <div className="sm:col-span-2">{text("message", "Message on the cake", 120, "e.g. Happy 5th Birthday Anu")}</div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 sm:col-span-2">
        <Checkbox label="Eggless" checked={value.isEggless} onChange={(e) => onChange({ ...value, isEggless: e.target.checked })} />
        <Checkbox label="Cupcakes" checked={value.hasCupcakes} onChange={(e) => onChange({ ...value, hasCupcakes: e.target.checked })} />
        <Checkbox label="Popsicles" checked={value.hasPopsicles} onChange={(e) => onChange({ ...value, hasPopsicles: e.target.checked })} />
      </div>
      <div className="sm:col-span-2">
        <Field label="Special instructions" htmlFor={id("instructions")}>
          <Textarea
            id={id("instructions")}
            value={value.instructions}
            onChange={(e) => onChange({ ...value, instructions: e.target.value })}
            maxLength={1000}
            className="min-h-16"
          />
        </Field>
      </div>
    </div>
  );
}

// Set-up and delivery charges (rupees, optional): each is its own line on the bill.
export function CakeChargeFields({
  value,
  onChange,
  idPrefix = "cake",
}: {
  value: CakeFormValue;
  onChange: (value: CakeFormValue) => void;
  idPrefix?: string;
}) {
  return (
    <>
      <Field label="Set-up charges (₹, optional)" htmlFor={`${idPrefix}-setup-charge`}>
        <Input
          id={`${idPrefix}-setup-charge`}
          inputMode="decimal"
          value={value.setupCharge}
          onChange={(e) => onChange({ ...value, setupCharge: e.target.value })}
          placeholder="0"
        />
      </Field>
      <Field label="Delivery charges (₹, optional)" htmlFor={`${idPrefix}-delivery-charge`}>
        <Input
          id={`${idPrefix}-delivery-charge`}
          inputMode="decimal"
          value={value.deliveryCharge}
          onChange={(e) => onChange({ ...value, deliveryCharge: e.target.value })}
          placeholder="0"
        />
      </Field>
    </>
  );
}
