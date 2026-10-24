// End-to-end walk through the daily workflows with the four staff logins (2026-10-24): website order →
// confirm, call order → payment → pack → handover → bill, custom cake → quotation file → send log →
// sticky note, and both kitchen screens (own orders only, never prices). It commits test orders
// (customer phones 90000 999xx), so run it against a demo or staging project.
// Needs: `npm run build && npm start -- -p 3100`; passwords in .admin-password.txt (or E2E_PASSWORDS_FILE).
// Usage (from web/): npm run e2e:workflow
import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "node:fs";

const m = JSON.parse(readFileSync("./.next/server/server-reference-manifest.json", "utf8"));
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, APP = process.env.APP_URL ?? "http://localhost:3100";
const passwords = readFileSync(process.env.E2E_PASSWORDS_FILE ?? ".admin-password.txt", "utf8");
const passwordFor = (email) => passwords.split("\n").find((l) => l.includes(email))?.trim().split(/\s+/).pop();
const actionId = (name) => Object.entries(m.node).find(([, v]) => v.exportedName === name)[0];
const results = [];
const check = (name, ok, detail = "") => results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
process.on("uncaughtException", (e) => { console.log(results.join("\n")); console.error("\nStopped:", e); process.exit(1); });

async function login(email) {
  const jar = new Map();
  const sb = createServerClient(URL_, KEY, { cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (cs) => cs.forEach(({ name, value }) => value ? jar.set(name, value) : jar.delete(name)),
  }});
  const { error } = await sb.auth.signInWithPassword({ email, password: passwordFor(email) });
  if (error) throw new Error(`${email}: ${error.message}`);
  return { sb, cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; ") };
}
async function page(path, cookie = "") {
  const r = await fetch(APP + path, { headers: { cookie }, redirect: "manual" });
  return { status: r.status, location: r.headers.get("location"), body: r.status === 200 ? await r.text() : "" };
}
async function act(name, path, arg, cookie) {
  const r = await fetch(APP + path, { method: "POST", headers: { cookie, "Next-Action": actionId(name), "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component" }, body: JSON.stringify(Array.isArray(arg) ? arg : [arg]) });
  const text = await r.text();
  const line = text.split("\n").find((l) => l.startsWith("1:"));
  try { return JSON.parse(line.slice(2)); } catch { return { raw: text.slice(0, 300), status: r.status }; }
}
async function quotationFile(orderId, format, cookie) {
  const r = await fetch(`${APP}/api/orders/${orderId}/quotation`, { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ format }) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
// Rupee amounts appear as "₹" in every staff page that shows money.
const hasPrice = (html) => html.includes("₹");
const istDay = (offset) => new Date(Date.now() + 5.5 * 3600e3 + offset * 86400e3).toISOString().slice(0, 10);
const tomorrow = istDay(1), later = istDay(2);
const tag = String(Date.now()).slice(-5);

const admin = await login("admin@auri.test");
const counter = await login("counter@auri.test");
const chef1 = await login("kitchen1@auri.test");
const chef2 = await login("kitchen2@auri.test");

const variant = async (product, name) => (await admin.sb.from("product_variants").select("id, products!inner(name)").ilike("products.name", product).ilike("name", name).is("archived_at", null).limit(1).single()).data?.id;
const blackForest = await variant("Black Forest%", "500%");
const vegPuff = await variant("Veg Puff%", "%");
check("catalogue variants found", Boolean(blackForest && vegPuff), `${blackForest} ${vegPuff}`);

// --- Admin pages ---------------------------------------------------------------------------------
for (const path of ["/admin", "/admin/orders", "/admin/calendar", "/admin/calendar?kind=custom", "/admin/products", "/admin/staff", "/admin/customers", "/admin/reports", "/admin/settings", "/admin/offers", "/admin/reviews", "/admin/gallery", "/admin/notifications", "/admin/orders/new?source=CALL", "/admin/orders/new-cake"]) {
  const p = await page(path, admin.cookie);
  check(`admin page ${path}`, p.status === 200, `status ${p.status} ${p.location ?? ""}`);
}

// --- Website order → confirm --------------------------------------------------------------------
let r = await fetch(`${APP}/api/site/order`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
  idempotencyKey: crypto.randomUUID(), name: `E2E Web ${tag}`, phone: "9000099902", date: later, time: "16:00", orderType: "birthday",
  message: "Write Happy Birthday Meera", items: [{ variantId: blackForest, quantity: 1 }], fulfilment: "collect",
}) }).then((x) => x.json());
check("website order accepted", r.ok === true && /^B-\d+/.test(r.reference ?? ""), JSON.stringify(r));
let web = (await admin.sb.from("orders").select("id, reference, status, version, source, kitchen_id, customer_notes").eq("reference", r.reference).single()).data;
check("website order is Online, waiting for confirmation, message kept", web?.source === "ONLINE" && web.status === "pending_confirmation" && /Happy Birthday Meera/.test(web.customer_notes ?? ""), JSON.stringify(web));
r = await act("confirmOrderAction", `/admin/orders/${web.id}`, { orderId: web.id, version: web.version }, admin.cookie);
check("admin confirms website order", r.ok === true, JSON.stringify(r));
web = (await admin.sb.from("orders").select("id, reference, status, version").eq("id", web.id).single()).data;
check("website order confirmed", web.status === "confirmed", web.status);

// --- Call order → payment → pack → handover → bill ----------------------------------------------
r = await act("createOrderAction", "/admin/orders/new", { idempotencyKey: crypto.randomUUID(), source: "CALL", items: [{ variantId: blackForest, quantity: 1, notes: "Less cream" }, { variantId: vegPuff, quantity: 4 }],
  customerName: `E2E Call ${tag}`, customerPhone: "9000099903", dueLocal: `${tomorrow}T12:00`, confirm: true, fulfilment: "collect" }, admin.cookie);
check("admin creates confirmed call order", r.ok === true, JSON.stringify(r));
const callId = r.orderId;
let call = (await admin.sb.from("order_summaries").select("*").eq("id", callId).single()).data;
check("call order totals", call?.total_paise > 0 && call.balance_paise === call.total_paise, `total ${call?.total_paise} balance ${call?.balance_paise}`);
r = await act("recordPaymentAction", `/admin/orders/${callId}`, { orderId: callId, idempotencyKey: crypto.randomUUID(), kind: "payment", method: "upi", amount: "200", reference: "UPI-E2E" }, counter.cookie);
check("counter records advance", r.ok === true, JSON.stringify(r));
call = (await admin.sb.from("order_summaries").select("*").eq("id", callId).single()).data;
r = await act("markPackedAction", `/admin/orders/${callId}`, { orderId: callId, version: call.version }, counter.cookie);
check("counter marks packed", r.ok === true, JSON.stringify(r));
call = (await admin.sb.from("order_summaries").select("*").eq("id", callId).single()).data;
check("packed order is ready", call.status === "ready", call.status);
r = await act("recordHandoverAction", `/admin/orders/${callId}`, { orderId: callId, version: call.version, collectedBy: "Customer" }, counter.cookie);
check("handover with balance due is refused", r.ok !== true, r.message);
r = await act("recordPaymentAction", `/admin/orders/${callId}`, { orderId: callId, idempotencyKey: crypto.randomUUID(), kind: "payment", method: "cash", amount: String(call.balance_paise / 100) }, counter.cookie);
check("counter takes the balance", r.ok === true, JSON.stringify(r));
call = (await admin.sb.from("order_summaries").select("*").eq("id", callId).single()).data;
r = await act("recordHandoverAction", `/admin/orders/${callId}`, { orderId: callId, version: call.version, collectedBy: "Customer" }, counter.cookie);
check("counter hands over", r.ok === true, JSON.stringify(r));
call = (await admin.sb.from("order_summaries").select("*").eq("id", callId).single()).data;
check("order completed and paid", call.status === "completed" && call.balance_paise === 0, `${call.status} balance ${call.balance_paise}`);
let bill = (await admin.sb.from("bills").select("id").eq("order_id", callId).maybeSingle()).data;
if (!bill) {
  r = await act("issueBillAction", `/admin/orders/${callId}`, callId, counter.cookie);
  check("counter issues bill", r.ok === true, JSON.stringify(r));
  bill = (await admin.sb.from("bills").select("id").eq("order_id", callId).maybeSingle()).data;
}
let p = await page(`/print/bill/${bill?.id}`, counter.cookie);
check("bill prints with shop details", p.status === 200 && p.body.includes(call.reference) && p.body.includes("Korattur"), `status ${p.status}`);

// --- Custom cake → quotation → send log → sticky note -------------------------------------------
r = await act("createCustomCakeOrderAction", "/admin/orders/new-cake", { idempotencyKey: crypto.randomUUID(), source: "CALL", customerName: `E2E Cake ${tag}`, customerPhone: "9000099904",
  dueLocal: `${tomorrow}T17:00`, price: "2500", advance: "1000", advanceMethod: "upi", confirm: true, fulfilment: "setup", setupAddress: "12 Anna Nagar, Chennai",
  cake: { flavour: "Rasmalai", weightKg: "1.5", tiers: "1", theme: "Floral", message: "Happy Birthday Anu", isEggless: true, cupcakeCount: "6", popsicleCount: "0", setupCharge: "500", deliveryCharge: "200" } }, admin.cookie);
check("admin creates confirmed custom cake order", r.ok === true, JSON.stringify(r));
const cakeId = r.orderId;
const cake = (await admin.sb.from("order_summaries").select("*").eq("id", cakeId).single()).data;
check("custom cake total = price + set-up + delivery, advance paid", cake?.total_paise === 320000 && cake.balance_paise === 220000, `total ${cake?.total_paise} balance ${cake?.balance_paise}`);
p = await page(`/admin/orders/${cakeId}`, counter.cookie);
check("order page shows cupcakes and quotation", p.status === 200 && /Cupcakes.{0,80}>6</.test(p.body) && p.body.includes("Quotation"), `status ${p.status}`);
let q = await quotationFile(cakeId, "pdf", counter.cookie);
check("counter makes quotation PDF", q.status === 200 && q.body.fileName === `LaPatisserie-Quotation-${cake.reference}.pdf`, JSON.stringify(q.body).slice(0, 200));
if (q.body.url) {
  const bytes = Buffer.from(await (await fetch(q.body.url)).arrayBuffer());
  check("signed link returns a PDF", bytes.subarray(0, 4).toString() === "%PDF", `${bytes.length} bytes`);
  r = await act("recordQuotationSendAction", `/admin/orders/${cakeId}`, { orderId: cakeId, format: "pdf", channel: "download_and_chat", path: q.body.path, caption: `Quotation ${cake.reference}` }, counter.cookie);
  check("quotation send recorded", r.ok === true, JSON.stringify(r));
}
q = await quotationFile(cakeId, "png", admin.cookie);
if (q.body.url) {
  const bytes = Buffer.from(await (await fetch(q.body.url)).arrayBuffer());
  check("quotation image is a PNG", q.status === 200 && bytes.subarray(1, 4).toString() === "PNG", `${bytes.length} bytes`);
} else check("quotation image is a PNG", false, JSON.stringify(q.body).slice(0, 200));
r = await act("sendQuotationNowAction", `/admin/orders/${cakeId}`, { orderId: cakeId, format: "pdf" }, counter.cookie);
check("one-tap send explains when WhatsApp Business is not set up", r.ok === true || /not set up/.test(r.message ?? ""), JSON.stringify(r));
r = await act("setStickyNoteAction", `/admin/orders/${cakeId}`, { orderId: cakeId, note: "Gold leaf on top", inWhatsApp: true }, counter.cookie);
check("sticky note saved", r.ok === true, JSON.stringify(r));
p = await page(`/admin/orders/${cakeId}`, admin.cookie);
check("order page shows sticky note and send log", p.body.includes("Gold leaf on top") && /Quotation (sent|downloaded|shared)/i.test(p.body), `status ${p.status}`);
p = await page(`/print/quotation/${cakeId}`, admin.cookie);
check("quotation print page shows price and note", p.status === 200 && hasPrice(p.body) && p.body.includes("Gold leaf on top"), `status ${p.status}`);
p = await page(`/admin/calendar?kind=custom&from=${tomorrow}`, admin.cookie);
check("custom calendar lists the cake, not the call order", p.body.includes(cake.reference) && !p.body.includes(call.reference), `status ${p.status}`);
p = await page(`/admin/calendar?from=${tomorrow}`, admin.cookie);
check("orders calendar lists the call order", p.body.includes(call.reference), `status ${p.status}`);

// --- Kitchens -------------------------------------------------------------------------------------
const kitchenOf = async (id) => (await admin.sb.from("orders").select("kitchens(code)").eq("id", id).single()).data?.kitchens?.code;
const routes = { web: await kitchenOf(web.id), call: await kitchenOf(callId), cake: await kitchenOf(cakeId) };
check("orders routed to a kitchen", Object.values(routes).every(Boolean), JSON.stringify(routes));
for (const [chef, code] of [[chef1, "K1"], [chef2, "K2"]]) {
  const t = await page("/kitchen?tab=tomorrow", chef.cookie);
  const l = await page("/kitchen?tab=later", chef.cookie);
  const html = t.body + l.body;
  check(`${code} kitchen screen loads without prices`, t.status === 200 && l.status === 200 && !hasPrice(html), `${t.status}/${l.status}`);
  check(`${code} sees its own custom cake only`, html.includes(cake.reference) === (routes.cake === code), `cake → ${routes.cake}`);
  check(`${code} sees its own website order only`, html.includes(web.reference) === (routes.web === code), `web → ${routes.web}`);
  const kq = await page(`/kitchen/quotation/${cakeId}`, chef.cookie);
  if (routes.cake === code) check(`${code} kitchen quotation has no prices`, kq.status === 200 && kq.body.includes("Rasmalai") && !hasPrice(kq.body), `status ${kq.status}`);
  else check(`${code} cannot open another kitchen's quotation`, kq.status !== 200 || !kq.body.includes("Rasmalai"), `status ${kq.status}`);
  const api = await quotationFile(cakeId, "pdf", chef.cookie);
  check(`${code} chef gets 403 from quotation file`, api.status === 403, `status ${api.status}`);
  const a = await page("/admin/orders", chef.cookie);
  check(`${code} chef kept out of admin`, a.status !== 200, `${a.status} ${a.location ?? ""}`);
}

// --- Website review → approve ---------------------------------------------------------------------
const reviewer = `E2E Reviewer ${tag}`;
r = await fetch(`${APP}/api/site/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: reviewer, rating: 5, comment: "Lovely cake, test review." }) }).then((x) => x.json());
check("website review accepted", r.ok === true, JSON.stringify(r));
const review = (await admin.sb.from("reviews").select("id, status").eq("customer_name", reviewer).single()).data;
check("new review waits for approval", review?.status === "pending", JSON.stringify(review));
const content = async () => JSON.stringify(await fetch(`${APP}/api/site/content`).then((x) => x.json()));
check("pending review not on website", !(await content()).includes(reviewer));
await act("setReviewStatus", "/admin/reviews", [review.id, "approved"], admin.cookie).catch(() => null);
check("admin approves review", (await admin.sb.from("reviews").select("status").eq("id", review.id).single()).data?.status === "approved");
await act("deleteReview", "/admin/reviews", review.id, admin.cookie).catch(() => null);
check("admin deletes test review", !(await admin.sb.from("reviews").select("id").eq("id", review.id).maybeSingle()).data);

// --- Role limits ----------------------------------------------------------------------------------
p = await page("/admin/staff", counter.cookie);
check("counter kept out of staff page", p.status !== 200 || (p.body.includes("NEXT_REDIRECT") && !p.body.includes("kitchen1@auri.test")), `${p.status} ${p.location ?? ""}`);
r = await act("cancelOrderAction", `/admin/orders/${web.id}`, { orderId: web.id, version: web.version, reason: "E2E test" }, counter.cookie);
check("counter cannot cancel", r.ok !== true);
r = await act("cancelOrderAction", `/admin/orders/${web.id}`, { orderId: web.id, version: web.version, reason: "E2E test order, not real" }, admin.cookie);
check("admin cancels website test order", r.ok === true, JSON.stringify(r));

console.log(results.join("\n"));
const failed = results.filter((x) => x.startsWith("FAIL")).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
