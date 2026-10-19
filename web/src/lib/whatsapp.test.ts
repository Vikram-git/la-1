import { test } from "node:test";
import assert from "node:assert/strict";
import { availableMessages, messageText, whatsappLink, whatsappNumber, type MessageOrder } from "./whatsapp.ts";

const order: MessageOrder = {
  reference: "B-1023",
  customerName: "Priya Raman",
  status: "confirmed",
  fulfilment: "collect",
  setupAddress: null,
  dueAt: "2026-10-24T10:30:00Z",
  totalPaise: 150000,
  balancePaise: 50000,
  items: [{ name: "Black Forest Cake — 1 kg", quantity: 1 }, { name: "Butter Croissant — Each", quantity: 6 }],
};
const ctx = { shop: "La Patisserie", timeZone: "Asia/Kolkata", reviewUrl: "https://example.com/#testimonials" };

test("phone numbers become WhatsApp numbers with the country code", () => {
  assert.equal(whatsappNumber("98400 00001"), "919840000001");
  assert.equal(whatsappNumber("+91 98400-00001"), "919840000001");
  assert.equal(whatsappNumber("09840000001"), "919840000001");
  assert.equal(whatsappNumber("+447700900123"), "447700900123");
  assert.equal(whatsappNumber("12345"), null);
  assert.equal(whatsappNumber(null), null);
});

test("the messages offered follow the order's stage", () => {
  assert.deepEqual(availableMessages({ status: "pending_confirmation", balancePaise: 0 }), ["received"]);
  assert.deepEqual(availableMessages({ status: "confirmed", balancePaise: 100 }), ["confirmed", "balance"]);
  assert.deepEqual(availableMessages({ status: "ready", balancePaise: 0 }), ["ready"]);
  assert.deepEqual(availableMessages({ status: "completed", balancePaise: 0 }), ["thanks"]);
  assert.deepEqual(availableMessages({ status: "cancelled", balancePaise: 100 }), []);
});

test("the confirmation lists items, pickup time, total and balance in rupees", () => {
  const text = messageText("confirmed", order, ctx);
  assert.match(text, /^Hello Priya! ✅ Your order B-1023 is confirmed\./);
  assert.match(text, /• 6 × Butter Croissant — Each/);
  assert.match(text, /Pickup at La Patisserie: Sat, 24 Oct, 4:00 pm/i);
  assert.match(text, /Total: ₹1,500\nBalance to pay: ₹500/);
});

test("set-up orders mention the address; thanks links to reviews; links are encoded", () => {
  const setup = { ...order, status: "ready" as const, fulfilment: "setup" as const, setupAddress: "5 Lake View Road", balancePaise: 0 };
  assert.match(messageText("ready", setup, ctx), /We will be at 5 Lake View Road on .* to set it up\.\n\nFully paid ✅/);
  assert.match(messageText("thanks", order, ctx), /https:\/\/example\.com\/#testimonials$/);
  assert.equal(whatsappLink("919840000001", "Hi & bye"), "https://wa.me/919840000001?text=Hi%20%26%20bye");
});
