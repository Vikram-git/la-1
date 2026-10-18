"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkbox, dbError, text, zodErrors } from "@/lib/form";
import { offerSchema } from "@/lib/offers";
import { productPhotoPath } from "@/lib/product-photo";
import type { ActionState } from "@/components/form-status";

function readOffer(formData: FormData) {
  return offerSchema.safeParse({
    title: text(formData, "title"),
    body: text(formData, "body"),
    button_label: text(formData, "button_label"),
    button_link: text(formData, "button_link"),
    image_url: text(formData, "image_url"),
    starts_on: text(formData, "starts_on"),
    ends_on: text(formData, "ends_on"),
    is_active: checkbox(formData, "is_active"),
    sort_order: text(formData, "sort_order") || "0",
  });
}

// Admins only (row-level security agrees). id null adds a new offer.
export async function saveOffer(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertRole(["admin"]);
  const parsed = readOffer(formData);
  if (!parsed.success) return zodErrors(parsed.error);
  const supabase = await createClient();

  if (!id) {
    const { error } = await supabase.from("offers").insert(parsed.data);
    if (error) return dbError(error, "offer");
    revalidatePath("/admin/offers");
    return { ok: true, message: "Offer added." };
  }

  const offerId = z.uuid().parse(id);
  const { data: before } = await supabase.from("offers").select("image_url").eq("id", offerId).maybeSingle();
  const { error } = await supabase.from("offers").update(parsed.data).eq("id", offerId);
  if (error) return dbError(error, "offer");
  await removeOldPhoto(before?.image_url, parsed.data.image_url);
  revalidatePath("/admin/offers");
  return { ok: true, message: "Saved." };
}

export async function deleteOffer(id: string) {
  await assertRole(["admin"]);
  const supabase = await createClient();
  const offerId = z.uuid().parse(id);
  const { data: before } = await supabase.from("offers").select("image_url").eq("id", offerId).maybeSingle();
  const { error } = await supabase.from("offers").delete().eq("id", offerId);
  if (error) throw new Error(error.message);
  await removeOldPhoto(before?.image_url, null);
  revalidatePath("/admin/offers");
}

async function removeOldPhoto(oldUrl: string | null | undefined, newUrl: string | null) {
  const oldPath = productPhotoPath(oldUrl);
  if (!oldPath || oldUrl === newUrl || !oldPath.startsWith("offers/")) return;
  const supabase = await createClient();
  await supabase.storage.from("product-photos").remove([oldPath]);
}
