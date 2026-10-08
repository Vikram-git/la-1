// Custom cake details (owner, 2026-10-09). Pure: imported by unit tests, so keep any imports from "@/" type-only.
import { z } from "zod";

const optional = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label}: at most ${max} characters.`)
    .transform((v) => v.trim() || undefined)
    .optional();

// Mirrors private.clean_cake in the database; the database has the final say.
export const cakeDetailsSchema = z.object({
  flavour: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1, "Enter the flavour.").max(80, "Keep the flavour under 80 characters.")),
  weightKg: z.coerce
    .number({ error: "Enter the weight in kg." })
    .min(0.25, "Weight must be between 0.25 and 50 kg.")
    .max(50, "Weight must be between 0.25 and 50 kg."),
  tiers: z.coerce.number().int("Tiers must be a whole number.").min(1, "Tiers must be between 1 and 10.").max(10, "Tiers must be between 1 and 10."),
  theme: optional(200, "Theme"),
  cream: optional(80, "Cream"),
  filling: optional(80, "Filling"),
  toppings: optional(200, "Toppings"),
  message: optional(120, "Message"),
  isEggless: z.boolean(),
  instructions: optional(1000, "Instructions"),
});

export type CakeDetailsInput = z.input<typeof cakeDetailsSchema>;
export type CakeDetails = z.output<typeof cakeDetailsSchema>;

// The jsonb the database functions take (custom_cakes column names).
export function cakeToJson(c: CakeDetails) {
  return {
    flavour: c.flavour,
    weight_kg: c.weightKg,
    tiers: c.tiers,
    theme: c.theme ?? null,
    cream: c.cream ?? null,
    filling: c.filling ?? null,
    toppings: c.toppings ?? null,
    message: c.message ?? null,
    is_eggless: c.isEggless,
    instructions: c.instructions ?? null,
  };
}

// "1.5 kg · 2 tiers": the order line's variant name, as private.cake_size_name writes it.
export function cakeSizeName(weightKg: number, tiers: number): string {
  const kg = Number(weightKg.toFixed(2)).toString();
  return `${kg} kg${tiers > 1 ? ` · ${tiers} tiers` : ""}`;
}

export const CAKE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const CAKE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function cakePhotoProblem(file: { type: string; size: number }): string | null {
  if (!(CAKE_PHOTO_TYPES as readonly string[]).includes(file.type)) return "Use a JPEG, PNG or WebP photo.";
  if (file.size > CAKE_PHOTO_MAX_BYTES) return "The photo is larger than 5 MB.";
  return null;
}

export function photoExtension(type: string): string {
  return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
}
