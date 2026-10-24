// The quotation (2026-10-24): one model, read from public.order_quotation, drawn three ways — the page,
// the PDF and the PNG. "full" (admin, counter) carries every amount; "kitchen" (chefs) carries none: the
// database leaves the amount keys out, and parseQuotation drops them again so no view can show one.
import { z } from "zod";
import { cakeRows, type CakeInfo } from "./kitchen.ts";
import { formatPaise } from "./money.ts";
import { formatDateTime } from "./time.ts";

// The app's palette (globals.css) for the PDF and PNG, which cannot read CSS variables.
export const QUOTATION_COLOURS = {
  ink: "#3a2a30", muted: "#7d6870", brand: "#b93f63", brandStrong: "#9c3253", soft: "#fde7ee", canvas: "#fdf5f6", line: "#f1dde3", gold: "#9a634e",
};

export type QuotationMode = "full" | "kitchen";
export type LineKind = "cake" | "setup" | "delivery" | "item";

export type QuotationLine = {
  lineNo: number;
  name: string;
  variant: string;
  quantity: number;
  kind: LineKind;
  isEggless: boolean;
  notes: string | null;
  unitPricePaise: number | null; // null in kitchen mode
  lineTotalPaise: number | null;
};

export type QuotationAmounts = {
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  creditedPaise: number;
  advancePaise: number;
  balancePaise: number;
};

export type Quotation = {
  mode: QuotationMode;
  timeZone: string;
  shop: { name: string; phone: string | null; email: string | null; address: string | null };
  order: {
    id: string;
    reference: string;
    status: string;
    createdAt: string;
    dueAt: string | null;
    isImmediate: boolean;
    fulfilment: "collect" | "setup";
    setupAddress: string | null;
    setupNote: string | null;
    customerNotes: string | null;
    kitchen: string | null;
  };
  cake: CakeInfo | null;
  lines: QuotationLine[];
  amounts: QuotationAmounts | null; // null in kitchen mode
};

const paise = z.coerce.number().int();
const text = z.string().nullish().transform((v) => (v && v.trim() ? v.trim() : null));
const raw = z.object({
  mode: z.enum(["full", "kitchen"]),
  timezone: z.string().default("Asia/Kolkata"),
  shop: z.object({ name: z.string().default("La Patisserie"), phone: text, email: text, address: text }),
  order: z.object({
    id: z.string(),
    reference: z.string(),
    status: z.string(),
    created_at: z.string(),
    due_at: z.string().nullish(),
    is_immediate: z.boolean().default(false),
    fulfilment: z.enum(["collect", "setup"]).default("collect"),
    setup_address: text,
    setup_note: text,
    customer_notes: text,
    kitchen: text,
  }),
  cake: z.record(z.string(), z.unknown()).nullish(),
  items: z.array(
    z.object({
      line_no: z.number(),
      name: z.string(),
      variant: z.string(),
      quantity: z.number(),
      kind: z.enum(["cake", "setup", "delivery", "item"]),
      is_eggless: z.boolean().default(false),
      notes: text,
      unit_price_paise: paise.optional(),
      line_total_paise: paise.optional(),
    }),
  ),
  amounts: z
    .object({
      subtotal_paise: paise,
      discount_paise: paise,
      tax_paise: paise,
      total_paise: paise,
      credited_paise: paise,
      advance_paise: paise,
      balance_paise: paise,
    })
    .optional(),
});

export function parseQuotation(value: unknown): Quotation {
  const q = raw.parse(value);
  const full = q.mode === "full";
  if (full && !q.amounts) throw new Error("The quotation has no amounts.");
  return {
    mode: q.mode,
    timeZone: q.timezone,
    shop: q.shop,
    order: {
      id: q.order.id,
      reference: q.order.reference,
      status: q.order.status,
      createdAt: q.order.created_at,
      dueAt: q.order.due_at ?? null,
      isImmediate: q.order.is_immediate,
      fulfilment: q.order.fulfilment,
      setupAddress: q.order.setup_address,
      setupNote: q.order.setup_note,
      customerNotes: q.order.customer_notes,
      kitchen: q.order.kitchen,
    },
    cake: (q.cake as CakeInfo | null | undefined) ?? null,
    lines: q.items.map((i) => ({
      lineNo: i.line_no,
      name: i.name,
      variant: i.variant,
      quantity: i.quantity,
      kind: i.kind,
      isEggless: i.is_eggless,
      notes: i.notes,
      unitPricePaise: full ? (i.unit_price_paise ?? 0) : null,
      lineTotalPaise: full ? (i.line_total_paise ?? 0) : null,
    })),
    amounts:
      full && q.amounts
        ? {
            subtotalPaise: q.amounts.subtotal_paise,
            discountPaise: q.amounts.discount_paise,
            taxPaise: q.amounts.tax_paise,
            totalPaise: q.amounts.total_paise,
            creditedPaise: q.amounts.credited_paise,
            advancePaise: q.amounts.advance_paise,
            balancePaise: q.amounts.balance_paise,
          }
        : null,
  };
}

// The kitchen version of any quotation: what /kitchen/quotation shows, whoever opens it.
export function withoutPrices(q: Quotation): Quotation {
  return {
    ...q,
    mode: "kitchen",
    amounts: null,
    lines: q.lines.map((l) => ({ ...l, unitPricePaise: null, lineTotalPaise: null })),
  };
}

// File names never carry the customer's name.
export function quotationFileName(reference: string, format: "pdf" | "png"): string {
  return `LaPatisserie-Quotation-${reference.replace(/[^A-Za-z0-9-]/g, "")}.${format}`;
}

export const LINE_KIND_LABEL: Record<LineKind, string> = { cake: "Custom cake", setup: "Set-up", delivery: "Delivery", item: "Item" };

// Everything a quotation shows, already as text, so the three renderers draw the same thing.
export type QuotationView = {
  priced: boolean;
  title: string;
  shopName: string;
  shopContact: string[];
  facts: { label: string; value: string }[];
  cake: { label: string; value: string }[];
  lines: { key: number; title: string; detail: string | null; quantity: string; unit: string | null; total: string | null }[];
  totals: { label: string; value: string; strong?: boolean }[];
  notes: { label: string; value: string }[];
};

export function quotationView(q: Quotation, issuedAt: Date = new Date()): QuotationView {
  const tz = q.timeZone;
  const priced = q.mode === "full" && q.amounts !== null;
  const facts = [
    { label: "Quotation no.", value: q.order.reference },
    { label: "Date", value: formatDate(issuedAt, tz) },
    {
      label: q.order.fulfilment === "setup" ? "Set-up date & time" : "Pickup date & time",
      value: q.order.dueAt ? formatDateTime(q.order.dueAt, tz) : "To be confirmed",
    },
    { label: "Venue", value: q.order.fulfilment === "setup" ? (q.order.setupAddress ?? "To be confirmed") : `Collect from ${q.shop.name}` },
  ];
  if (!priced && q.order.kitchen) facts.push({ label: "Kitchen", value: q.order.kitchen });

  const lines = q.lines.map((l) => ({
    key: l.lineNo,
    title: l.kind === "setup" || l.kind === "delivery" ? `${LINE_KIND_LABEL[l.kind]} — ${l.variant}` : `${l.name} — ${l.variant}`,
    detail: [l.isEggless ? "Eggless" : null, l.notes].filter(Boolean).join(" · ") || null,
    quantity: String(l.quantity),
    unit: priced && l.unitPricePaise !== null ? formatPaise(l.unitPricePaise) : null,
    total: priced && l.lineTotalPaise !== null ? formatPaise(l.lineTotalPaise) : null,
  }));

  const totals: QuotationView["totals"] = [];
  const a = priced ? q.amounts : null;
  if (a) {
    if (a.discountPaise > 0) {
      totals.push({ label: "Subtotal", value: formatPaise(a.subtotalPaise) });
      totals.push({ label: "Discount", value: `−${formatPaise(a.discountPaise)}` });
    }
    totals.push({ label: "Included GST", value: formatPaise(a.taxPaise) });
    totals.push({ label: "Total", value: formatPaise(a.totalPaise), strong: true });
    if (a.creditedPaise > 0) totals.push({ label: "Credited", value: `−${formatPaise(a.creditedPaise)}` });
    totals.push({ label: "Advance paid", value: formatPaise(a.advancePaise) });
    totals.push({ label: a.balancePaise < 0 ? "Refund due" : "Balance", value: formatPaise(Math.abs(a.balancePaise)), strong: true });
  }

  const notes: { label: string; value: string }[] = [];
  if (q.order.setupNote) notes.push({ label: "Set-up note", value: q.order.setupNote });
  if (q.order.customerNotes) notes.push({ label: "Notes", value: q.order.customerNotes });

  return {
    priced,
    title: priced ? "Quotation" : "Kitchen quotation",
    shopName: q.shop.name,
    shopContact: [q.shop.address, q.shop.phone, q.shop.email].filter((v): v is string => Boolean(v)),
    facts,
    cake: q.cake ? cakeRows(q.cake) : [],
    lines,
    totals,
    notes,
  };
}

function formatDate(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone, day: "numeric", month: "long", year: "numeric" }).format(value);
}
