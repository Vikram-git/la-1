// Offers & Banners (owner, 2026-10-18). Pure: imported by unit tests, so keep any imports from "@/" type-only.
import { z } from "zod";
import { productPhotoPath } from "./product-photo.ts";

// Same rule as the offers_button_link_check constraint: a section of the website (#contact), a page (/…) or https.
export const LINK_PATTERN = /^(#[A-Za-z][A-Za-z0-9_-]*|\/[^\s]*|https:\/\/[^\s]+)$/;

// Offer photos live in the public product-photos bucket under offers/.
export const OFFER_PHOTO_FOLDER = "offers";

const optionalText = (max: number, label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v),
    z.string().max(max, `${label}: at most ${max} characters.`).nullable(),
  );
const optionalDate = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.").nullable(),
);

export const offerSchema = z
  .object({
    title: z.string().trim().min(1, "Give the offer a title.").max(80, "Keep the title under 80 characters."),
    body: optionalText(300, "Text"),
    button_label: optionalText(30, "Button text"),
    button_link: optionalText(300, "Button link").refine((v) => v === null || LINK_PATTERN.test(v), {
      message: "Use a section such as #contact or #products, or a full https:// address.",
    }),
    image_url: optionalText(500, "Photo").refine((v) => v === null || productPhotoPath(v)?.startsWith(`${OFFER_PHOTO_FOLDER}/`), {
      message: "Upload the photo again.",
    }),
    starts_on: optionalDate,
    ends_on: optionalDate,
    is_active: z.boolean(),
    sort_order: z.coerce.number().int("Order is a whole number.").min(0).max(9999),
  })
  .refine((o) => !o.starts_on || !o.ends_on || o.ends_on >= o.starts_on, { message: "The end date is before the start date.", path: ["ends_on"] })
  .refine((o) => !o.button_label === !o.button_link, { message: "Give the button both a text and a link, or neither.", path: ["button_link"] });

export type OfferInput = z.infer<typeof offerSchema>;

// What staff see in the list: whether the website shows the offer today.
export function offerState(
  o: { is_active: boolean; starts_on: string | null; ends_on: string | null },
  today: string,
): "live" | "scheduled" | "ended" | "off" {
  if (!o.is_active) return "off";
  if (o.ends_on && o.ends_on < today) return "ended";
  if (o.starts_on && o.starts_on > today) return "scheduled";
  return "live";
}
