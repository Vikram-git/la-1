"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, ButtonLink, Field, Input, cx } from "@/components/ui";
import { CakeFields, type CakeFormValue } from "@/components/cake-fields";
import { cakePhotoProblem } from "@/lib/custom-cake";
import { paiseToRupeesInput } from "@/lib/money";
import { uploadPhoto } from "@/lib/photo-upload";
import { setCustomCakePhotoAction, updateCustomCakeAction } from "../actions";

export type CustomCake = {
  flavour: string;
  weight_kg: number;
  tiers: number;
  theme: string | null;
  cream: string | null;
  filling: string | null;
  toppings: string | null;
  message: string | null;
  is_eggless: boolean;
  instructions: string | null;
};

// The custom cake as a yellow sticky note (owner's mock-up), with its photo, edit and print.
export function CakeCard({
  orderId,
  version,
  cake,
  pricePaise,
  photoUrl,
  canEdit,
  canChangePhoto,
}: {
  orderId: string;
  version: number;
  cake: CustomCake;
  pricePaise: number;
  photoUrl: string | null;
  canEdit: boolean;
  canChangePhoto: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<CakeFormValue>(() => ({
    flavour: cake.flavour,
    weightKg: String(Number(cake.weight_kg)),
    tiers: String(cake.tiers),
    theme: cake.theme ?? "",
    cream: cake.cream ?? "",
    filling: cake.filling ?? "",
    toppings: cake.toppings ?? "",
    message: cake.message ?? "",
    isEggless: cake.is_eggless,
    instructions: cake.instructions ?? "",
  }));
  const [price, setPrice] = useState(paiseToRupeesInput(pricePaise));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const result = await updateCustomCakeAction({
        orderId,
        version,
        price,
        cake: { ...value },
      }).catch(() => ({ ok: false as const, message: "Not saved, check the connection." }));
      if (result.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(result.message ?? "Could not save the cake.");
      }
    });
  }

  function changePhoto(file: File | null) {
    setError(null);
    start(async () => {
      let path: string | null = null;
      if (file) {
        const problem = cakePhotoProblem(file);
        if (problem) return setError(problem);
        const uploaded = await uploadPhoto("custom-cake-photos", orderId, file);
        if ("error" in uploaded) return setError(uploaded.error);
        path = uploaded.path;
      }
      const result = await setCustomCakePhotoAction({ orderId, path }).catch(() => ({ ok: false as const, message: "Not saved, check the connection." }));
      if (result.ok) router.refresh();
      else setError(result.message ?? "Could not change the photo.");
    });
  }

  const rows: [string, string | null][] = [
    ["Flavour", cake.flavour],
    ["Size", `${Number(cake.weight_kg)} kg${cake.tiers > 1 ? ` · ${cake.tiers} tiers` : ""}`],
    ["Design / theme", cake.theme],
    ["Cream", cake.cream],
    ["Filling", cake.filling],
    ["Toppings", cake.toppings],
    ["Instructions", cake.instructions],
  ];

  return (
    <section aria-label="Custom cake" className="relative rotate-[-0.3deg] rounded-sm border border-note-line bg-note p-5 shadow-[0_10px_24px_-14px_rgba(120,90,0,0.45)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">🎂 Custom cake</h2>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/print/cake/${orderId}`} variant="secondary">Print cake sheet</ButtonLink>
          {canEdit && !editing && <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-4 rounded-xl bg-surface/80 p-4">
          <CakeFields value={value} onChange={setValue} idPrefix="edit-cake" />
          <Field label="Price (₹, incl. GST)" htmlFor="edit-cake-price" hint="Changing the price changes the order total.">
            <Input id="edit-cake-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="max-w-40" />
          </Field>
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="flex gap-2">
            <Button disabled={pending} onClick={save}>{pending ? "Saving…" : "Save cake"}</Button>
            <Button variant="secondary" onClick={() => { setEditing(false); setError(null); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            {cake.message && (
              <p className="mb-3 font-script text-3xl leading-tight text-script">“{cake.message}”</p>
            )}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {rows
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
            </dl>
            <p className={cx("mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", cake.is_eggless ? "bg-ok-soft text-ok" : "bg-surface text-ink")}>
              {cake.is_eggless ? "Eggless" : "With egg"}
            </p>
            {error && <div className="mt-3"><Alert tone="danger">{error}</Alert></div>}
          </div>
          <div className="flex flex-col items-start gap-2">
            {photoUrl ? (
              <a href={photoUrl} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
                <img src={photoUrl} alt="Customer's reference photo" className="h-48 w-48 rounded-lg border border-note-line bg-surface object-cover" />
              </a>
            ) : (
              <div className="flex h-48 w-48 items-center justify-center rounded-lg border border-dashed border-note-line bg-surface/60 text-sm text-muted">
                No reference photo
              </div>
            )}
            {canChangePhoto && (
              <div className="flex flex-wrap gap-2">
                <label className={cx("cursor-pointer rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-brand-soft", pending && "pointer-events-none opacity-60")}>
                  {photoUrl ? "Replace photo" : "Add photo"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => changePhoto(e.target.files?.[0] ?? null)} />
                </label>
                {photoUrl && (
                  <Button variant="ghost" disabled={pending} onClick={() => changePhoto(null)}>Remove</Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
