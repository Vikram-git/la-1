import { test } from "node:test";
import assert from "node:assert/strict";
import { attentionCount, navSections, SOON_PAGES } from "./shell.ts";

const hrefs = (role: "admin" | "counter") => navSections(role).flatMap((s) => s.items.map((i) => i.href));

test("admins see every working screen and the coming-soon ones", () => {
  const h = hrefs("admin");
  for (const href of ["/admin", "/admin/orders", "/admin/calendar", "/admin/customers", "/admin/products",
    "/admin/reports", "/admin/staff", "/admin/settings"]) assert.ok(h.includes(href), href);
  for (const slug of ["notifications", "offers", "reviews"]) assert.ok(h.includes(`/admin/soon/${slug}`), slug);
});

test("KOT and Counter Sale are gone and custom cakes are no longer coming soon", () => {
  for (const role of ["admin", "counter"] as const) {
    const h = hrefs(role);
    assert.ok(!h.includes("/admin/kot"));
    assert.ok(!h.includes("/admin/counter"));
    assert.ok(!h.includes("/admin/soon/custom-cakes"));
  }
  assert.equal(SOON_PAGES["custom-cakes"], undefined);
});

test("Customers takes KOT's place, right after Calendar, for counter staff too", () => {
  for (const role of ["admin", "counter"] as const) {
    const h = hrefs(role);
    assert.equal(h[h.indexOf("/admin/calendar") + 1], "/admin/customers", role);
  }
});

test("counter staff never see admin-only screens", () => {
  const h = hrefs("counter");
  for (const href of ["/admin/reports", "/admin/staff", "/admin/settings"]) assert.ok(!h.includes(href), href);
  for (const href of ["/admin", "/admin/orders", "/admin/calendar", "/admin/customers", "/admin/products"]) assert.ok(h.includes(href), href);
});

test("the staff screen is called Staff", () => {
  assert.equal(navSections("admin").flatMap((s) => s.items).find((i) => i.href === "/admin/staff")?.label, "Staff");
});

test("coming-soon items are marked as such and in their own section", () => {
  const soon = navSections("admin").find((s) => s.title === "Coming soon");
  assert.ok(soon);
  assert.ok(soon.items.every((i) => i.soon && i.href.startsWith("/admin/soon/")));
  assert.ok(navSections("admin").filter((s) => s.title !== "Coming soon").every((s) => s.items.every((i) => !i.soon)));
});

test("the bell counts orders awaiting confirmation and late pickups, ignoring missing or negative values", () => {
  assert.equal(attentionCount({ pending: 2, latePickups: 1 }), 3);
  assert.equal(attentionCount({ pending: null, latePickups: -1 }), 0);
});
