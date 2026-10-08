import { test } from "node:test";
import assert from "node:assert/strict";
import { CAKE_PHOTO_MAX_BYTES, cakeDetailsSchema, cakePhotoProblem, cakeSizeName } from "./custom-cake.ts";

test("the size reads like the order line the database writes", () => {
  assert.equal(cakeSizeName(1.5, 2), "1.5 kg · 2 tiers");
  assert.equal(cakeSizeName(1, 1), "1 kg");
  assert.equal(cakeSizeName(0.75, 1), "0.75 kg");
});

test("cake details: flavour and a sensible weight are required, the rest is optional", () => {
  const ok = cakeDetailsSchema.safeParse({ flavour: " Chocolate ", weightKg: "1.5", tiers: "2", isEggless: true });
  assert.ok(ok.success);
  assert.equal(ok.data.flavour, "Chocolate");
  assert.equal(ok.data.weightKg, 1.5);
  assert.equal(ok.data.tiers, 2);
  assert.equal(ok.data.theme, undefined);
  assert.ok(!cakeDetailsSchema.safeParse({ flavour: "", weightKg: "1", tiers: "1", isEggless: false }).success);
  assert.ok(!cakeDetailsSchema.safeParse({ flavour: "Vanilla", weightKg: "0", tiers: "1", isEggless: false }).success);
  assert.ok(!cakeDetailsSchema.safeParse({ flavour: "Vanilla", weightKg: "60", tiers: "1", isEggless: false }).success);
  assert.ok(!cakeDetailsSchema.safeParse({ flavour: "Vanilla", weightKg: "1", tiers: "11", isEggless: false }).success);
});

test("only JPEG, PNG or WebP photos up to 5 MB", () => {
  assert.equal(cakePhotoProblem({ type: "image/jpeg", size: 1000 }), null);
  assert.match(cakePhotoProblem({ type: "image/gif", size: 1000 }) ?? "", /JPEG, PNG or WebP/);
  assert.match(cakePhotoProblem({ type: "image/png", size: CAKE_PHOTO_MAX_BYTES + 1 }) ?? "", /5 MB/);
});
