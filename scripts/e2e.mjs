// Browser end-to-end test. Boots the API and serves the built web app (dist/)
// with an /api proxy, then drives headless Chrome over CDP to:
//   1. verify key screens render real data,
//   2. drive a full purchase cycle (new PO -> confirm -> convert -> pay) in the UI,
//   3. drive a full sales cycle (new SO -> generate invoice -> receive payment),
//   4. capture screenshots.
import { spawn } from "node:child_process";
import http from "node:http";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import apiApp from "../apps/api/src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "apps", "web", "dist");
const SHOTS = join(__dirname, "..", "screenshots");

const API_PORT = 4000;
const WEB_PORT = 4173;
const CDP_PORT = 9300 + Math.floor(Math.random() * 500);
const PROFILE = join(__dirname, `.chrome-profile-${process.pid}`);

let passed = 0;
let failed = 0;
const check = (name, cond, extra = "") => {
  if (cond) { passed += 1; console.log(`  ok  ${name}`); }
  else { failed += 1; console.log(`FAIL  ${name} ${extra}`); }
};

if (!existsSync(join(DIST, "index.html"))) {
  console.error("Run vite build first.");
  process.exit(1);
}

// ----------------------------------- boot -----------------------------------

apiApp.listen(API_PORT, () => console.log("API on", API_PORT));

const web = express();
web.use("/api", (req, res) => {
  const proxy = http.request(
    { host: "127.0.0.1", port: API_PORT, path: req.originalUrl, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${API_PORT}` } },
    (up) => { res.writeHead(up.statusCode, up.headers); up.pipe(res); }
  );
  proxy.on("error", () => res.status(502).end());
  req.pipe(proxy);
});
web.use(express.static(DIST));
web.use((_req, res) => res.sendFile(join(DIST, "index.html")));
await new Promise((r) => web.listen(WEB_PORT, r));
console.log("Web on", WEB_PORT);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (email, password) => {
  const res = await fetch(`http://127.0.0.1:${API_PORT}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return (await res.json()).token;
};
const apiGet = async (path, token) => {
  const res = await fetch(`http://127.0.0.1:${API_PORT}/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
};

// ----------------------------------- chrome -----------------------------------

const candidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "chrome",
].filter(Boolean);
const CHROME = candidates.find((c) => !c.includes("chrome.exe") || existsSync(c)) || "chrome";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--window-size=1440,1000", `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${PROFILE}`, "about:blank",
]);
chrome.stderr.on("data", (d) => process.env.E2E_DEBUG && console.error("[chrome]", String(d).slice(0, 200)));

let targetId = null;
for (let i = 0; i < 60; i++) {
  try {
    const targets = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).then((r) => r.json());
    const page = targets.find((t) => t.type === "page");
    if (page) { targetId = page.id; break; }
  } catch { /* not up */ }
  await sleep(400);
}
if (!targetId) { console.error("Chrome CDP did not come up."); chrome.kill(); process.exit(1); }

const ws = new WebSocket(`ws://127.0.0.1:${CDP_PORT}/devtools/page/${targetId}`);
let msgId = 0;
const pending = new Map();
const pageErrors = [];
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === "Runtime.exceptionThrown") {
    const d = msg.params?.exceptionDetails;
    pageErrors.push(d?.exception?.description || d?.text || "exception");
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++msgId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
await send("Runtime.enable");

async function navigate(url, waitMs = 1800) {
  await send("Page.navigate", { url });
  await sleep(waitMs);
}
async function js(expression) {
  const out = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (out.result?.exceptionDetails) return null;
  return out.result?.result?.value;
}
async function bodyText() {
  return (await js("document.body ? document.body.innerText : ''")) || "";
}
async function screenshot(name) {
  const out = await send("Page.captureScreenshot", { format: "png" });
  mkdirSync(SHOTS, { recursive: true });
  writeFileSync(join(SHOTS, name), Buffer.from(out.result.data, "base64"));
  console.log("  shot", name);
}
async function setAuth(token, user) {
  await js(
    `localStorage.setItem('uf_token', ${JSON.stringify(token)}); localStorage.setItem('uf_user', ${JSON.stringify(JSON.stringify(user))}); 'ok'`
  );
}
const waitFor = async (expr, label, timeout = 8000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const v = await js(expr);
    if (v) return true;
    await sleep(250);
  }
  console.log(`  wait-for timed out: ${label}`);
  return false;
};
const clickText = async (text, { exact = false, scope = "document" } = {}) => {
  const mode = exact ? "===" : ".includes";
  return js(
    `(() => { const els = [...${scope}.querySelectorAll('button, [role=button], a')]; const el = els.find(b => (b.innerText || '').trim() ${mode} ${JSON.stringify(text)}); if (el) { el.click(); return 'clicked'; } return 'not-found'; })()`
  );
};
const setInputBySel = (sel, value) =>
  js(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'missing'; const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, ${JSON.stringify(String(value))}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'set'; })()`);
const selectOption = async (sel, value) =>
  js(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'missing'; el.value = ${JSON.stringify(String(value))}; el.dispatchEvent(new Event('change', { bubbles: true })); return el.value; })()`);
const setCheck = (label) =>
  js(`(() => { const lb = [...document.querySelectorAll('label')].find(l => l.innerText.includes(${JSON.stringify(label)})); const cb = lb && lb.querySelector('input[type=checkbox]'); if (cb) { cb.click(); return 'checked'; } return 'no-label'; })()`);

// ------------------------------ screen checks ------------------------------

console.log("screen checks");
await navigate(`http://127.0.0.1:${WEB_PORT}/login`, 2600);
let text = await bodyText();
check("login screen renders", text.includes("Sign in to your workspace"));
await screenshot("01-login.png");

const adminToken = await login("admin@urbanfurniture.com", "admin123");
const adminUser = { name: "Rohan Deshmukh", email: "admin@urbanfurniture.com", role: "admin", contactId: null };
await setAuth(adminToken, adminUser);

await navigate(`http://127.0.0.1:${WEB_PORT}/`);
text = await bodyText();
check("dashboard renders KPIs with money", text.includes("Cash & bank balance") && /\u20b9/.test(text));
await screenshot("02-dashboard.png");

await navigate(`http://127.0.0.1:${WEB_PORT}/contacts`);
text = await bodyText();
check("contacts page renders seeded data", text.includes("Azure Furniture") && text.includes("Nimesh Pathak"));

await navigate(`http://127.0.0.1:${WEB_PORT}/reports/balance-sheet`);
text = await bodyText();
check("balance sheet balances", text.includes("Total assets") && text.includes("Balanced"));
await screenshot("03-balance-sheet.png");

// --------------------------- purchase cycle in UI ---------------------------

console.log("purchase cycle (UI)");
await navigate(`http://127.0.0.1:${WEB_PORT}/purchase-orders?new=1`, 2000);
await waitFor(`document.querySelectorAll('.fixed input[type=number]').length >= 1`, "PO modal opened");

const vendorSel = `document.querySelectorAll('.fixed select')[0]`;
const productSel = `document.querySelectorAll('.fixed select')[2]`;
const qtyInput = `document.querySelectorAll('.fixed input[type=number]')[0]`;

const vendorId = await js(
  `(() => { const s = document.querySelectorAll('.fixed select')[0]; const o = [...s.options].find(x => x.text.includes('Azure Furniture')); return o ? o.value : null; })()`
);
check("PO modal lists vendor Azure Furniture", !!vendorId);
const prodVal = await js(
  `(() => { const s = document.querySelectorAll('.fixed select')[2]; const o = [...s.options].find(x => x.text.includes('Office Chair')); return o ? o.value : null; })()`
);
check("line editor lists products", !!prodVal);
await selectOption(vendorSel, vendorId);
await selectOption(productSel, prodVal);
await setInputBySel(qtyInput, 3);
await clickText("Create draft", { scope: `document.querySelector('.fixed')` });
const poCreated = await waitFor(`document.body.innerText.includes('PO #') && !document.body.innerText.includes('Choose a vendor')`, "PO created & modal closed");
check("PO created from UI", poCreated);

await waitFor(`[...document.querySelectorAll('button')].some(b => b.innerText.trim() === 'Confirm')`, "confirm button");
await clickText("Confirm", { exact: true });
await waitFor(`[...document.querySelectorAll('button')].some(b => b.innerText.includes('Convert to bill'))`, "convert button after confirm");
await clickText("Convert to bill");
const billToast = await waitFor(`document.body.innerText.includes('Vendor bill #')`, "convert toast");
check("PO converted to bill via UI", billToast);
await screenshot("04-after-convert.png");

await navigate(`http://127.0.0.1:${WEB_PORT}/vendor-bills`, 2000);
const newBill = await js(`(() => { const rows = [...document.querySelectorAll('tbody tr')]; const r = rows.find(x => x.innerText.includes('Bill #') && x.innerText.includes('Azure Furniture') && x.innerText.includes('12,300')); return r ? 'found' : null; })()`);
check("new vendor bill listed with total", newBill === "found", String(newBill));
await clickText("Pay", { scope: `document.querySelector('tbody tr')` });
await waitFor(`document.body.innerText.includes('Register payment')`, "doc detail opened");
await clickText("Register payment", { exact: true });
await waitFor(`document.body.innerText.includes('Record payment')`, "pay modal opened");
await clickText("Record payment", { exact: true });
const paidToast = await waitFor(`document.body.innerText.includes('recorded')`, "payment toast");
check("bill paid through UI", paidToast);

// ----------------------------- sales cycle in UI -----------------------------

console.log("sales cycle (UI)");
await navigate(`http://127.0.0.1:${WEB_PORT}/sales-orders?new=1`, 2000);
await waitFor(`document.querySelectorAll('.fixed select').length >= 3`, "SO modal opened");
const custSel = `document.querySelectorAll('.fixed select')[0]`;
const soProductSel = `document.querySelectorAll('.fixed select')[2]`;
const soQty = `document.querySelectorAll('.fixed input[type=number]')[0]`;
const custId = await js(
  `(() => { const s = document.querySelectorAll('.fixed select')[0]; const o = [...s.options].find(x => x.text.includes('Nimesh Pathak')); return o ? o.value : null; })()`
);
check("SO modal lists customer", !!custId);
await selectOption(custSel, custId);
const soProd = await js(
  `(() => { const s = document.querySelectorAll('.fixed select')[2]; const o = [...s.options].find(x => x.text.includes('Wooden Chair')); return o ? o.value : null; })()`
);
await selectOption(soProductSel, soProd);
await setInputBySel(soQty, 4); // 4 x 4500 = 18000, + 18% = 21240
await setCheck("Mark confirmed");
await waitFor(`[...document.querySelectorAll('.fixed button')].some(b => b.innerText.includes('Create & confirm'))`, "confirmed label");
await clickText("Create & confirm");
await waitFor(`document.body.innerText.includes('SO #') && !document.body.innerText.includes('Choose a customer')`, "SO created");
await waitFor(`[...document.querySelectorAll('button')].some(b => b.innerText.includes('Generate invoice'))`, "generate button");
await clickText("Generate invoice");
const invToast = await waitFor(`document.body.innerText.includes('Customer invoice #')`, "invoice toast");
check("SO invoiced through UI", invToast);
await screenshot("05-after-invoice.png");

await navigate(`http://127.0.0.1:${WEB_PORT}/customer-invoices`, 2000);
const newInv = await js(`(() => { const rows = [...document.querySelectorAll('tbody tr')]; const r = rows.find(x => x.innerText.includes('INV #') && x.innerText.includes('21,240')); return r ? 'found' : null; })()`);
check("new invoice listed with tax-inclusive total", newInv === "found", String(newInv));
await clickText("Receive", { scope: `document.querySelector('tbody tr')` });
await waitFor(`document.body.innerText.includes('Register payment')`, "invoice detail");
await clickText("Register payment", { exact: true });
await clickText("Record payment", { exact: true });
const invPaid = await waitFor(`document.body.innerText.includes('recorded')`, "payment toast");
check("invoice paid through UI", invPaid);

// ------------------------------ contact portal ------------------------------

console.log("contact portal");
const contactToken = await login("nimesh@pathak.com", "contact123");
const contactUser = { name: "Nimesh Pathak", email: "nimesh@pathak.com", role: "contact", contactId: null };
await setAuth(contactToken, contactUser);
await navigate(`http://127.0.0.1:${WEB_PORT}/my`, 2000);
text = await bodyText();
check("contact sees portal with pay buttons", text.includes("Your invoices") && text.includes("Pay now"));
await screenshot("06-contact-portal.png");

// verify through the API that the flow landed correctly
const after = await apiGet("/reports/dashboard", adminToken);
check("dashboard reflects the new receivables/payables", after.counts.invoices >= 3 && after.counts.bills >= 3, JSON.stringify(after.counts));

check("no uncaught page errors", pageErrors.length === 0, JSON.stringify(pageErrors.slice(0, 2)));

console.log("");
console.log(`E2E done: ${passed} passed, ${failed} failed`);
try { chrome.kill(); } catch { /* noop */ }
rmSync(PROFILE, { recursive: true, force: true });
process.exit(failed === 0 ? 0 : 1);