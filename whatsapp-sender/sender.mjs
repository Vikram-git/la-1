// La Patisserie Madras: WhatsApp sender for the shop computer (owner, 2026-11-07).
// Linked to the bakery's WhatsApp like WhatsApp Web (scan the QR once), it sends the bill and Terms files the
// admin queues ("Send bill and Terms on WhatsApp") into the chat of the number the customer gave, then reports
// back to the order. Unofficial: WhatsApp may restrict a number it thinks is automated, so it sends slowly.
// Usage: npm start, then open http://localhost:4020 (sign in with a counter or admin login, scan the QR).
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import makeWASocket, { Browsers, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from "baileys";
import pino from "pino";
import QRCode from "qrcode";

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.SENDER_PORT ?? 4020);
const AUTH_DIR = join(HERE, "auth");
const SESSION_FILE = join(HERE, "session.json");

// The bakery's Supabase project: the public URL and publishable key (the same ones the website uses).
function readWebEnv() {
  const file = join(HERE, "..", "web", ".env.local");
  const out = {};
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^"|"$/g, "");
    }
  }
  return out;
}
const webEnv = readWebEnv();
const SUPABASE_URL = process.env.SUPABASE_URL ?? webEnv.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? webEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Supabase URL and publishable key not found (web/.env.local, or SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY).");
  process.exit(1);
}

// The staff login stays signed in between restarts (refresh token in session.json, never the password).
const fileStorage = {
  getItem: (k) => (existsSync(SESSION_FILE) ? (JSON.parse(readFileSync(SESSION_FILE, "utf8"))[k] ?? null) : null),
  setItem: (k, v) => {
    const all = existsSync(SESSION_FILE) ? JSON.parse(readFileSync(SESSION_FILE, "utf8")) : {};
    all[k] = v;
    writeFileSync(SESSION_FILE, JSON.stringify(all), { mode: 0o600 });
  },
  removeItem: (k) => {
    if (!existsSync(SESSION_FILE)) return;
    const all = JSON.parse(readFileSync(SESSION_FILE, "utf8"));
    delete all[k];
    writeFileSync(SESSION_FILE, JSON.stringify(all), { mode: 0o600 });
  },
};
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storage: fileStorage, persistSession: true, autoRefreshToken: true } });

const state = { staffEmail: null, wa: "starting", qr: null, linkedPhone: null, sent: 0, failed: 0, lastError: null, log: [] };
let sock = null;
let busy = false;

const masked = (n) => (n && n.length > 6 ? `${n.slice(0, 2)}••••••${n.slice(-4)}` : n ?? "");
function note(line) {
  const entry = `${new Date().toLocaleTimeString("en-IN")}  ${line}`;
  console.log(entry);
  state.log.unshift(entry);
  state.log.length = Math.min(state.log.length, 30);
}

async function signedIn() {
  const { data } = await supabase.auth.getSession();
  state.staffEmail = data.session?.user?.email ?? null;
  return Boolean(data.session);
}

async function heartbeat() {
  if (!(await signedIn())) return;
  const s = state.wa === "connected" ? "connected" : state.wa === "qr" ? "waiting_for_qr" : "disconnected";
  const { error } = await supabase.rpc("whatsapp_sender_heartbeat", { p_state: s, p_linked_phone: state.linkedPhone });
  if (error) state.lastError = `Heartbeat: ${error.message}`;
}

async function connectWhatsApp() {
  mkdirSync(AUTH_DIR, { recursive: true });
  const { state: auth, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
  sock = makeWASocket({ auth, version, browser: Browsers.macOS("La Patisserie Sender"), logger: pino({ level: "silent" }), markOnlineOnConnect: false });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async (u) => {
    if (u.qr) {
      state.wa = "qr";
      state.qr = await QRCode.toDataURL(u.qr, { margin: 1, width: 320 });
      note("Scan the QR code at http://localhost:" + PORT + " with the bakery's WhatsApp (Linked devices).");
    }
    if (u.connection === "open") {
      state.wa = "connected";
      state.qr = null;
      state.linkedPhone = sock.user?.id?.split(":")[0]?.split("@")[0] ?? null;
      note(`Connected to WhatsApp ${masked(state.linkedPhone)}.`);
      heartbeat();
    }
    if (u.connection === "close") {
      const code = u.lastDisconnect?.error?.output?.statusCode;
      state.wa = "disconnected";
      if (code === DisconnectReason.loggedOut) {
        note("WhatsApp logged this computer out. A new QR code will appear; scan it again.");
        rmSync(AUTH_DIR, { recursive: true, force: true });
      } else note("WhatsApp connection dropped; reconnecting…");
      setTimeout(connectWhatsApp, 3000);
    }
  });
}

async function sendOne() {
  if (busy || state.wa !== "connected" || !(await signedIn())) return;
  busy = true;
  try {
    const { data: jobs, error } = await supabase.rpc("claim_whatsapp_job");
    if (error) {
      state.lastError = `Could not read the queue: ${error.message}`;
      return;
    }
    const job = jobs?.[0];
    if (!job) return;
    const label = `${job.document} ${job.format.toUpperCase()} → ${masked(job.to_phone)}`;
    let result;
    try {
      const [exists] = await sock.onWhatsApp(job.to_phone);
      if (!exists?.exists) throw new Error("This number is not on WhatsApp.");
      const { data: blob, error: dlError } = await supabase.storage.from("quotations").download(job.file_path);
      if (dlError || !blob) throw new Error("Could not download the file.");
      const file = Buffer.from(await blob.arrayBuffer());
      const content = job.format === "png"
        ? { image: file, caption: job.caption ?? undefined }
        : { document: file, mimetype: "application/pdf", fileName: job.file_name, caption: job.caption ?? undefined };
      const sent = await sock.sendMessage(exists.jid, content);
      result = { p_status: "sent", p_message_id: sent?.key?.id ?? null };
      state.sent++;
      note(`Sent ${label}`);
    } catch (e) {
      result = { p_status: "failed", p_problem: String(e?.message ?? e).slice(0, 300) };
      state.failed++;
      note(`Not sent ${label}: ${result.p_problem}`);
    }
    const { error: finishError } = await supabase.rpc("finish_whatsapp_job", { p_job_id: job.id, ...result });
    if (finishError) state.lastError = `Could not report back: ${finishError.message}`;
    // A short pause between messages, so the number does not look like a bulk sender.
    await new Promise((ok) => setTimeout(ok, 2500));
  } finally {
    busy = false;
  }
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function page(message = "") {
  const login = state.staffEmail
    ? `<p class="ok">● Signed in as ${esc(state.staffEmail)} <form method="post" action="/logout" style="display:inline"><button>Sign out</button></form></p>`
    : `<form method="post" action="/login" class="card"><h2>1. Sign in with a counter or admin login</h2>
       <input name="email" type="email" placeholder="Email" required> <input name="password" type="password" placeholder="Password" required>
       <button>Sign in</button></form>`;
  const wa = state.wa === "connected"
    ? `<p class="ok">● Connected to WhatsApp ${esc(masked(state.linkedPhone))}. Bills and Terms are sent automatically.</p>`
    : state.qr
      ? `<div class="card"><h2>2. Link the bakery's WhatsApp</h2><p>On the bakery phone: WhatsApp → Settings → <b>Linked devices</b> → <b>Link a device</b>, then scan:</p><img src="${state.qr}" alt="QR code"></div>`
      : `<p>Connecting to WhatsApp…</p>`;
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="5"><title>WhatsApp sender</title>
<style>body{font-family:system-ui;max-width:640px;margin:30px auto;padding:0 16px;color:#222}h1{color:#075e54}.card{border:1px solid #ddd;border-radius:12px;padding:16px;margin:12px 0}
.ok{color:#1f9d55;font-weight:600}input{padding:8px;border:1px solid #ccc;border-radius:8px;margin:4px 0}button{padding:8px 14px;border-radius:8px;border:0;background:#1f9d55;color:#fff;cursor:pointer}
pre{background:#f6f6f6;padding:10px;border-radius:8px;font-size:12px;white-space:pre-wrap}.warn{color:#9a6200}</style>
<h1>La Patisserie Madras · WhatsApp sender</h1>
${message ? `<p class="warn">${esc(message)}</p>` : ""}${login}${state.staffEmail ? wa : ""}
<p>Sent: <b>${state.sent}</b> · Not sent: <b>${state.failed}</b>${state.lastError ? ` · <span class="warn">${esc(state.lastError)}</span>` : ""}</p>
<p class="warn">Keep this computer on and this window running. Close it to stop sending.</p>
<pre>${esc(state.log.join("\n")) || "Nothing yet."}</pre>`;
}

createServer(async (req, res) => {
  const html = (body) => { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(body); };
  if (req.headers.host && !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host)) { res.writeHead(403); return res.end(); }
  if (req.method === "POST") {
    let body = "";
    for await (const c of req) body += c;
    const form = new URLSearchParams(body);
    if (req.url === "/login") {
      const { error } = await supabase.auth.signInWithPassword({ email: form.get("email") ?? "", password: form.get("password") ?? "" });
      await signedIn();
      if (!error) heartbeat();
      return html(page(error ? `Could not sign in: ${error.message}` : ""));
    }
    if (req.url === "/logout") {
      await supabase.auth.signOut();
      state.staffEmail = null;
      return html(page());
    }
  }
  await signedIn();
  html(page());
}).listen(PORT, "127.0.0.1", () => {
  console.log(`WhatsApp sender: open http://localhost:${PORT}`);
});

await signedIn();
connectWhatsApp();
setInterval(heartbeat, 15_000);
setInterval(() => sendOne().catch((e) => { state.lastError = String(e?.message ?? e); busy = false; }), 3000);
