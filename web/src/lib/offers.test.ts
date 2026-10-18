import { test } from "node:test";
import assert from "node:assert/strict";
import { offerSchema, offerState } from "./offers.ts";

const base = { title: " Diwali box ", body: "", button_label: "", button_link: "", image_url: "", starts_on: "", ends_on: "", is_active: true, sort_order: "0" };

test("an offer needs a title; blanks become null", () => {
  const ok = offerSchema.safeParse(base);
  assert.ok(ok.success);
  assert.equal(ok.data.title, "Diwali box");
  assert.equal(ok.data.body, null);
  assert.equal(ok.data.starts_on, null);
  assert.ok(!offerSchema.safeParse({ ...base, title: "  " }).success);
});

test("button links: website sections, pages or https only, with a text", () => {
  assert.ok(offerSchema.safeParse({ ...base, button_label: "Order", button_link: "#contact" }).success);
  assert.ok(offerSchema.safeParse({ ...base, button_label: "Menu", button_link: "https://example.com/menu" }).success);
  assert.ok(!offerSchema.safeParse({ ...base, button_label: "x", button_link: "javascript:alert(1)" }).success);
  assert.ok(!offerSchema.safeParse({ ...base, button_label: "x", button_link: "http://example.com" }).success);
  assert.ok(!offerSchema.safeParse({ ...base, button_link: "#contact" }).success);
});

test("photos must be our own offer uploads; dates in order", () => {
  const ours = "https://x.supabase.co/storage/v1/object/public/product-photos/offers/a.jpg";
  assert.ok(offerSchema.safeParse({ ...base, image_url: ours }).success);
  assert.ok(!offerSchema.safeParse({ ...base, image_url: "https://evil.example/a.jpg" }).success);
  assert.ok(!offerSchema.safeParse({ ...base, image_url: ours.replace("offers/", "p1/") }).success);
  assert.ok(!offerSchema.safeParse({ ...base, starts_on: "2026-10-20", ends_on: "2026-10-19" }).success);
});

test("whether the website shows an offer today", () => {
  const today = "2026-10-18";
  assert.equal(offerState({ is_active: true, starts_on: null, ends_on: null }, today), "live");
  assert.equal(offerState({ is_active: true, starts_on: "2026-10-18", ends_on: "2026-10-18" }, today), "live");
  assert.equal(offerState({ is_active: true, starts_on: "2026-10-19", ends_on: null }, today), "scheduled");
  assert.equal(offerState({ is_active: true, starts_on: null, ends_on: "2026-10-17" }, today), "ended");
  assert.equal(offerState({ is_active: false, starts_on: null, ends_on: null }, today), "off");
});
