"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Alert, Button, Checkbox, Field, Input, Textarea, cx } from "@/components/ui";
import { FormMessage, SubmitButton, type ActionState } from "@/components/form-status";
import { browserClient } from "@/lib/supabase/browser";
import { uploadPhoto } from "@/lib/photo-upload";
import { OFFER_PHOTO_FOLDER } from "@/lib/offers";
import type { Tables } from "@/lib/database.types";

type Offer = Tables<"offers">;
type SaveAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

// Add or edit one offer. The photo goes straight to Storage (offers/…); the form then saves its URL.
export function OfferForm({ offer, action, submitLabel }: { offer?: Offer; action: SaveAction; submitLabel: string }) {
  const [imageUrl, setImageUrl] = useState(offer?.image_url ?? "");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  // A new offer's form starts empty again once it is added.
  const [state, formAction] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.ok && !offer) {
      ref.current?.reset();
      setImageUrl("");
    }
    return result;
  }, {});
  const err = state.fieldErrors ?? {};
  const id = offer?.id ?? "new";

  function pick(file: File | null) {
    if (!file) return;
    setPhotoError(null);
    startUpload(async () => {
      const uploaded = await uploadPhoto("product-photos", OFFER_PHOTO_FOLDER, file);
      if ("error" in uploaded) return setPhotoError(uploaded.error);
      setImageUrl(browserClient().storage.from("product-photos").getPublicUrl(uploaded.path).data.publicUrl);
    });
  }

  return (
    <form ref={ref} action={formAction} className="grid gap-4 md:grid-cols-2">
      <Field label="Title" htmlFor={`${id}-title`} error={err.title} className="md:col-span-2">
        <Input id={`${id}-title`} name="title" required maxLength={80} defaultValue={offer?.title} placeholder="e.g. Diwali sweet boxes — 10% off" />
      </Field>
      <Field label="Text (optional)" htmlFor={`${id}-body`} error={err.body} className="md:col-span-2">
        <Textarea id={`${id}-body`} name="body" rows={2} maxLength={300} defaultValue={offer?.body ?? ""} placeholder="One or two lines about the offer." />
      </Field>

      <div className="flex flex-col gap-2 md:col-span-2">
        <span className="text-sm font-medium">Photo (optional)</span>
        <div className="flex flex-wrap items-center gap-3">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Storage URL, shown as uploaded
            <img src={imageUrl} alt="" className="h-20 w-32 rounded-xl border border-line object-cover" />
          ) : (
            <div className="flex h-20 w-32 items-center justify-center rounded-xl border border-dashed border-line text-xs text-muted">No photo</div>
          )}
          <label className={cx("cursor-pointer rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:bg-brand-soft", uploading && "pointer-events-none opacity-60")}>
            {uploading ? "Uploading…" : imageUrl ? "Replace photo" : "Add photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </label>
          {imageUrl && <Button type="button" variant="ghost" onClick={() => setImageUrl("")}>Remove photo</Button>}
        </div>
        <input type="hidden" name="image_url" value={imageUrl} />
        <p className="text-xs text-muted">JPEG, PNG or WebP, up to 5 MB. A wide photo looks best.</p>
        {(photoError || err.image_url) && <Alert tone="danger">{photoError ?? err.image_url}</Alert>}
      </div>

      <Field label="Button text (optional)" htmlFor={`${id}-label`} error={err.button_label}>
        <Input id={`${id}-label`} name="button_label" maxLength={30} defaultValue={offer?.button_label ?? ""} placeholder="e.g. Order now" />
      </Field>
      <Field label="Button goes to" htmlFor={`${id}-link`} error={err.button_link} hint="#contact (order form), #products, or a full https:// address.">
        <Input id={`${id}-link`} name="button_link" maxLength={300} defaultValue={offer?.button_link ?? ""} placeholder="#contact" />
      </Field>
      <Field label="Show from (optional)" htmlFor={`${id}-from`} error={err.starts_on}>
        <Input id={`${id}-from`} name="starts_on" type="date" defaultValue={offer?.starts_on ?? ""} />
      </Field>
      <Field label="Until (optional)" htmlFor={`${id}-until`} error={err.ends_on} hint="Shown through this day.">
        <Input id={`${id}-until`} name="ends_on" type="date" defaultValue={offer?.ends_on ?? ""} />
      </Field>
      <Field label="Order" htmlFor={`${id}-sort`} error={err.sort_order} hint="Lower numbers show first.">
        <Input id={`${id}-sort`} name="sort_order" inputMode="numeric" defaultValue={offer?.sort_order ?? 0} />
      </Field>
      <div className="flex items-end pb-2">
        <Checkbox name="is_active" label="Show on the website" defaultChecked={offer?.is_active ?? true} />
      </div>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <SubmitButton disabled={uploading}>{submitLabel}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
