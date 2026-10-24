import { test } from "node:test";
import assert from "node:assert/strict";
import { cloudFormats, cloudLogCaption, quotationTemplateMessage, sendQuotationOnWhatsApp, whatsappCloudConfig } from "./whatsapp-cloud.ts";

const env = { WHATSAPP_TOKEN: "tok", WHATSAPP_PHONE_NUMBER_ID: "12345" };

test("automatic sending is off until the token and phone number id are set", () => {
  assert.equal(whatsappCloudConfig({}), null);
  assert.equal(whatsappCloudConfig({ WHATSAPP_TOKEN: "tok" }), null);
  assert.equal(whatsappCloudConfig({ WHATSAPP_TOKEN: " ", WHATSAPP_PHONE_NUMBER_ID: "1" }), null);
  assert.deepEqual(cloudFormats(null), []);

  const cfg = whatsappCloudConfig(env)!;
  assert.equal(cfg.templates.pdf, "quotation_pdf");
  assert.equal(cfg.templates.png, null);
  assert.equal(cfg.language, "en");
  assert.equal(cfg.autoSendOnConfirm, false);
  assert.deepEqual(cloudFormats(cfg), ["pdf"]);

  const all = whatsappCloudConfig({ ...env, WHATSAPP_QUOTATION_TEMPLATE_PNG: "quotation_png", WHATSAPP_AUTO_SEND_ON_CONFIRM: "TRUE" })!;
  assert.deepEqual(cloudFormats(all), ["pdf", "png"]);
  assert.equal(all.autoSendOnConfirm, true);
});

test("the template carries the file and the order number, never the customer's name", () => {
  const cfg = whatsappCloudConfig({ ...env, WHATSAPP_QUOTATION_TEMPLATE_PNG: "quotation_png" })!;
  const pdf = quotationTemplateMessage(cfg, { to: "919840000001", format: "pdf", mediaId: "m1", fileName: "LaPatisserie-Quotation-AB-1.pdf", reference: "AB-1" });
  assert.equal(pdf.to, "919840000001");
  assert.equal(pdf.template.name, "quotation_pdf");
  assert.deepEqual(pdf.template.components, [
    { type: "header", parameters: [{ type: "document", document: { id: "m1", filename: "LaPatisserie-Quotation-AB-1.pdf" } }] },
    { type: "body", parameters: [{ type: "text", text: "AB-1" }] },
  ]);
  const png = quotationTemplateMessage(cfg, { to: "919840000001", format: "png", mediaId: "m2", fileName: "x.png", reference: "AB-1" });
  assert.equal(png.template.name, "quotation_png");
  assert.deepEqual(png.template.components[0], { type: "header", parameters: [{ type: "image", image: { id: "m2" } }] });
  assert.equal(cloudLogCaption(cfg, "pdf", "AB-1"), 'WhatsApp template "quotation_pdf" · order AB-1');
});

function fakeFetch(replies: { status: number; body: unknown }[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const r = replies.shift()!;
    return new Response(JSON.stringify(r.body), { status: r.status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const message = { to: "919840000001", format: "pdf" as const, file: Buffer.from("%PDF"), fileName: "q.pdf", contentType: "application/pdf", reference: "AB-1" };

test("the file is uploaded to WhatsApp first, then the template is sent with it", async () => {
  const cfg = whatsappCloudConfig(env)!;
  const { impl, calls } = fakeFetch([
    { status: 200, body: { id: "media-1" } },
    { status: 200, body: { messages: [{ id: "wamid.1" }] } },
  ]);
  assert.deepEqual(await sendQuotationOnWhatsApp(cfg, message, impl), { ok: true, messageId: "wamid.1" });
  assert.equal(calls[0].url, "https://graph.facebook.com/v21.0/12345/media");
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, "Bearer tok");
  assert.ok(calls[0].init?.body instanceof FormData);
  assert.equal(calls[1].url, "https://graph.facebook.com/v21.0/12345/messages");
  const sent = JSON.parse(String(calls[1].init?.body));
  assert.equal(sent.template.components[0].parameters[0].document.id, "media-1");
});

test("WhatsApp's refusals become plain messages for staff", async () => {
  const cfg = whatsappCloudConfig(env)!;
  const expired = fakeFetch([{ status: 401, body: { error: { code: 190, message: "Session has expired" } } }]);
  const r1 = await sendQuotationOnWhatsApp(cfg, message, expired.impl);
  assert.equal(r1.ok, false);
  assert.match(!r1.ok ? r1.message : "", /access token/);
  assert.equal(expired.calls.length, 1);

  const noTemplate = fakeFetch([
    { status: 200, body: { id: "media-1" } },
    { status: 404, body: { error: { code: 132001, message: "Template name does not exist" } } },
  ]);
  const r2 = await sendQuotationOnWhatsApp(cfg, message, noTemplate.impl);
  assert.match(!r2.ok ? r2.message : "", /template/);

  const offline = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
  const r3 = await sendQuotationOnWhatsApp(cfg, message, offline);
  assert.match(!r3.ok ? r3.message : "", /Could not reach WhatsApp/);

  const r4 = await sendQuotationOnWhatsApp(cfg, { ...message, format: "png" }, offline);
  assert.match(!r4.ok ? r4.message : "", /not set up/);
});
