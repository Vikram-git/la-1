"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Checkbox, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { CakeChargeFields, CakeFields, EMPTY_CAKE, type CakeFormValue } from "@/components/cake-fields";
import { FulfilmentFields, type FulfilmentValue } from "@/components/fulfilment-fields";
import { CustomerWarning } from "@/components/customer-warning";
import { OverridePrompt } from "@/components/override-prompt";
import { PickupWindows } from "@/components/pickup-windows";
import { cakePhotoProblem } from "@/lib/custom-cake";
import { formatPaise, parseRupeesToPaise } from "@/lib/money";
import { paymentMethodLabel, sourceLabel, type PaymentMethod } from "@/lib/orders";
import { uploadPhoto } from "@/lib/photo-upload";
import { createCustomCakeOrderAction, setCustomCakePhotoAction } from "../actions";

type Source = "IN_STORE" | "CALL" | "CUSTOMER";
const SOURCES: { value: Source; icon: string }[] = [
  { value: "IN_STORE", icon: "🏪" },
  { value: "CALL", icon: "📞" },
  { value: "CUSTOMER", icon: "💬" },
];

export function CakeOrderForm({
  isAdmin,
  defaultDueLocal,
  minDueLocal,
  kitchens,
}: {
  isAdmin: boolean;
  defaultDueLocal: string;
  minDueLocal: string;
  kitchens: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [source, setSource] = useState<Source>("CALL");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [dueLocal, setDueLocal] = useState(defaultDueLocal);
  const [fulfil, setFulfil] = useState<FulfilmentValue>({ fulfilment: "collect", address: "", note: "" });
  const [cake, setCake] = useState<CakeFormValue>(EMPTY_CAKE);
  // The kitchen that makes the cake; it shows on that kitchen's chef screen.
  const [kitchenId, setKitchenId] = useState(kitchens[0]?.id ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [advance, setAdvance] = useState("");
  const [advanceMethod, setAdvanceMethod] = useState<PaymentMethod>("upi");
  const [advanceReference, setAdvanceReference] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  // Counter staff confirm only in-store orders (as with any order); admins confirm any.
  const canConfirm = isAdmin || source === "IN_STORE";
  const [confirmChoice, setConfirmChoice] = useState(false);
  const confirm = canConfirm && confirmChoice;
  const [error, setError] = useState<{ message: string; kind?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const pricePaise = parseRupeesToPaise(price.trim() || "0") ?? 0;
  const advancePaise = parseRupeesToPaise(advance.trim() || "0") ?? 0;
  const chargesPaise = (parseRupeesToPaise(cake.setupCharge.trim() || "0") ?? 0) + (parseRupeesToPaise(cake.deliveryCharge.trim() || "0") ?? 0);
  const totalPaise = pricePaise + chargesPaise;
  const isSetup = fulfil.fulfilment === "setup";

  function choosePhoto(file: File | null) {
    setPhotoError(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    if (file) {
      const problem = cakePhotoProblem(file);
      if (problem) {
        setPhoto(null);
        setPhotoPreview(null);
        setPhotoError(problem);
        return;
      }
    }
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  function submit(overrideReason?: string) {
    setError(null);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof createCustomCakeOrderAction>>;
      try {
        result = await createCustomCakeOrderAction({
          idempotencyKey,
          source,
          customerName,
          customerPhone,
          dueLocal,
          price,
          cake: { ...cake },
          advance,
          advanceMethod: advancePaise > 0 ? advanceMethod : undefined,
          advanceReference,
          customerNotes,
          internalNotes,
          confirm,
          overrideReason,
          fulfilment: fulfil.fulfilment,
          setupAddress: fulfil.address,
          setupNote: fulfil.note,
          kitchenId: kitchenId || undefined,
        });
      } catch {
        result = { message: "Not saved, check the connection." };
      }
      if (!result.ok) {
        setError({ message: result.message ?? "Could not save the order.", kind: result.kind });
        return;
      }
      // The order exists; a photo that fails to upload can be added from the order page.
      let photoFailed = false;
      if (photo) {
        const uploaded = await uploadPhoto("custom-cake-photos", result.orderId, photo);
        if ("path" in uploaded) {
          const attached = await setCustomCakePhotoAction({ orderId: result.orderId, path: uploaded.path }).catch(() => ({ ok: false }));
          photoFailed = !attached.ok;
        } else {
          photoFailed = true;
        }
      }
      router.push(`/admin/orders/${result.orderId}?created=1${photoFailed ? "&photo=failed" : ""}`);
    });
  }

  const missing =
    !customerName.trim() || !customerPhone.trim() || !dueLocal || !cake.flavour.trim() || pricePaise <= 0 || (isSetup && !fulfil.address.trim());

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">The cake</h2>
          <CakeFields value={cake} onChange={(v) => { setError(null); setCake(v); }} />
          {kitchens.length > 0 && (
            <Field label="Made in" htmlFor="cake-kitchen" hint="The cake shows on this kitchen's chef screen.">
              <Select id="cake-kitchen" value={kitchenId} onChange={(e) => setKitchenId(e.target.value)}>
                {kitchens.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
                <option value="">Not set (every chef sees it)</option>
              </Select>
            </Field>
          )}
          <Field label="Reference photo (optional)" htmlFor="cake-photo" hint="JPEG, PNG or WebP, up to 5 MB." error={photoError ?? undefined}>
            <Input id="cake-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => choosePhoto(e.target.files?.[0] ?? null)} />
          </Field>
          {photoPreview && (
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview (blob URL) */}
              <img src={photoPreview} alt="Reference photo preview" className="h-40 w-40 rounded-xl border border-line object-cover" />
              <Button variant="ghost" onClick={() => choosePhoto(null)}>Remove photo</Button>
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Price and advance</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cake price (₹, incl. GST)" htmlFor="cake-price">
              <Input id="cake-price" inputMode="decimal" value={price} onChange={(e) => { setError(null); setPrice(e.target.value); }} placeholder="1500" required />
            </Field>
            <CakeChargeFields value={cake} onChange={(v) => { setError(null); setCake(v); }} />
            <Field label="Advance received (₹, optional)" htmlFor="cake-advance">
              <Input id="cake-advance" inputMode="decimal" value={advance} onChange={(e) => { setError(null); setAdvance(e.target.value); }} placeholder="500" />
            </Field>
            {advancePaise > 0 && (
              <>
                <Field label="Advance paid by" htmlFor="advance-method">
                  <Select id="advance-method" value={advanceMethod} onChange={(e) => setAdvanceMethod(e.target.value as PaymentMethod)}>
                    {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
                      <option key={m} value={m}>{paymentMethodLabel[m]}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Reference (optional)" htmlFor="advance-ref" hint="e.g. UPI transaction id">
                  <Input id="advance-ref" value={advanceReference} onChange={(e) => setAdvanceReference(e.target.value)} maxLength={100} />
                </Field>
              </>
            )}
          </div>
          {pricePaise > 0 && (
            <p className="text-sm">
              Total {formatPaise(totalPaise)}
              {chargesPaise > 0 && <span className="text-muted"> (cake {formatPaise(pricePaise)} + charges {formatPaise(chargesPaise)})</span>}
              {advancePaise > 0 && (
                <>
                  {" "}· Advance {formatPaise(advancePaise)} ·{" "}
                  <span className={cx("font-semibold", advancePaise > totalPaise ? "text-danger" : "text-warn")}>
                    {advancePaise > totalPaise ? "Advance is more than the total" : `Balance ${formatPaise(totalPaise - advancePaise)}`}
                  </span>
                </>
              )}
            </p>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Order taken</h2>
          <div role="radiogroup" aria-label="Order taken" className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <label
                key={s.value}
                className={cx(
                  "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
                  source === s.value ? "border-brand bg-brand-soft text-brand-strong" : "border-line text-muted hover:border-brand/40",
                  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                )}
              >
                <input type="radio" name="cake-source" className="sr-only" checked={source === s.value} onChange={() => setSource(s.value)} />
                <span aria-hidden>{s.icon}</span>
                {sourceLabel[s.value]}
              </label>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer name" htmlFor="cake-cname">
              <Input id="cake-cname" value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={80} autoComplete="off" required />
            </Field>
            <Field label="Phone" htmlFor="cake-cphone">
              <Input id="cake-cphone" type="tel" inputMode="tel" value={customerPhone} onChange={(e) => { setError(null); setCustomerPhone(e.target.value); }} autoComplete="off" required />
            </Field>
          </div>
          <CustomerWarning phone={customerPhone} />
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{isSetup ? "Set-up" : "Pickup"}</h2>
          <FulfilmentFields value={fulfil} onChange={(v) => { setError(null); setFulfil(v); }} idPrefix="cake-fulfil" />
          <Field label={isSetup ? "Set-up date and time" : "Pickup date and time"} htmlFor="cake-due">
            <Input id="cake-due" type="datetime-local" value={dueLocal} min={minDueLocal} onChange={(e) => { setError(null); setDueLocal(e.target.value); }} required />
          </Field>
          <PickupWindows
            dayKey={dueLocal.slice(0, 10)}
            time={dueLocal.slice(11, 16)}
            categoryIds={[]}
            onPick={(t) => { setError(null); setDueLocal(`${dueLocal.slice(0, 10)}T${t}`); }}
          />
          <Field label="Customer notes" htmlFor="cake-cnotes">
            <Textarea id="cake-cnotes" value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} maxLength={1000} className="min-h-14" />
          </Field>
          <Field label="Internal notes (staff only)" htmlFor="cake-inotes">
            <Textarea id="cake-inotes" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} maxLength={1000} className="min-h-14" />
          </Field>
          {canConfirm ? (
            <Checkbox
              label="Confirm now"
              hint="Confirms the promised date and design. Leave unticked to review later."
              checked={confirmChoice}
              onChange={(e) => setConfirmChoice(e.target.checked)}
            />
          ) : (
            <p className="text-sm text-muted">An admin will confirm this order.</p>
          )}
        </Card>

        {error && (
          <OverridePrompt
            key={error.message}
            title="Order not saved"
            error={error}
            isAdmin={isAdmin}
            pending={pending}
            onOverride={(reason) => submit(reason)}
          />
        )}

        <Button type="button" className="py-3 text-base" disabled={pending || missing || advancePaise > totalPaise} onClick={() => submit()}>
          {pending ? "Saving…" : `${confirm ? "Create and confirm" : "Create custom cake order"}${pricePaise > 0 ? ` · ${formatPaise(totalPaise)}` : ""}`}
        </Button>
        {missing && !pending && (
          <p className="-mt-2 text-xs text-muted">Needs the flavour, price, customer name and phone, the time{isSetup ? " and the set-up address" : ""}.</p>
        )}
      </div>
    </div>
  );
}
