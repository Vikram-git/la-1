import { test } from "node:test";
import assert from "node:assert/strict";
import { attentionCount, navSections } from "./shell.ts";

const hrefs = (role: "admin" | "counter") => navSections(role).flatMap((s) => s.items.map((i) => i.href));

test("admins see every working screen and the coming-soon ones", () => {
  const h = hrefs("admin");
  for (const href of ["/admin", "/admin/orders", "/admin/counter", "/admin/calendar", "/admin/kot", "/admin/products",
    "/admin/customers", "/admin/reports", "/admin/staff", "/admin/settings"]) assert.ok(h.includes(href), href);
  for (const slug of ["custom-cakes", "notifications", "offers", "reviews"]) assert.ok(h.includes(`/admin/soon/${slug}`), slug);
});

test("counter staff never see admin-only screens", () => {
  const h = hrefs("counter");
  for (const href of ["/admin/reports", "/admin/staff", "/admin/settings", "/admin/customers"]) assert.ok(!h.includes(href), href);
  for (const href of ["/admin", "/admin/orders", "/admin/counter", "/admin/calendar", "/admin/kot", "/admin/products"]) assert.ok(h.includes(href), href);
});

test("coming-soon items are marked as such and in their own section", () => {
  const soon = navSections("admin").find((s) => s.title === "Coming soon");
  assert.ok(soon);
  assert.ok(soon.items.every((i) => i.soon && i.href.startsWith("/admin/soon/")));
  assert.ok(navSections("admin").filter((s) => s.title !== "Coming soon").every((s) => s.items.every((i) => !i.soon)));
});

test("the bell counts what needs attention and ignores missing or negative values", () => {
  assert.equal(attentionCount({ pending: 2, kitchenAlerts: 3, latePickups: 1 }), 6);
  assert.equal(attentionCount({ pending: null, kitchenAlerts: -1, latePickups: undefined }), 0);
});
