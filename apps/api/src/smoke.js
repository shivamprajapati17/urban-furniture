// End-to-end smoke test. Boots the app on an ephemeral port, drives the real
// business flows with fetch, asserts invariants, then exits.
import app from "./index.js";

const PORT = 4317;
const BASE = `http://localhost:${PORT}`;

let passed = 0;
let failed = 0;
const check = (name, cond, extra = "") => {
  if (cond) {
    passed += 1;
    console.log(`  ok  ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name} ${extra}`);
  }
};

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const login = async (email, password) => {
  const { json } = await api("POST", "/auth/login", { body: { email, password } });
  return json.token;
};

const server = app.listen(PORT, async () => {
  try {
    console.log("Smoke test booted on", PORT);

    // --- Auth -----------------------------------------------------------------
    console.log("auth");
    const badLogin = await api("POST", "/auth/login", { body: { email: "admin@urbanfurniture.com", password: "wrong" } });
    check("rejects wrong password", badLogin.status === 401);

    const adminToken = await login("admin@urbanfurniture.com", "admin123");
    const acctToken = await login("accountant@urbanfurniture.com", "accountant123");
    const contactToken = await login("nimesh@pathak.com", "contact123");
    check("admin/accountant/contact login", !!(adminToken && acctToken && contactToken));

    const noToken = await api("GET", "/contacts");
    check("guards unauthenticated", noToken.status === 401);

    const contactDenied = await api("GET", "/contacts", { token: contactToken });
    check("contact cannot read internal routes", contactDenied.status === 403);

    // --- Master data ----------------------------------------------------------
    console.log("master data");
    const meta = await api("GET", "/meta", { token: adminToken });
    check("meta bundles master lists", meta.json.accounts?.length >= 10 && meta.json.journals?.length === 4 && meta.json.products?.length >= 5);

    const newContact = await api("POST", "/contacts", { token: adminToken, body: { name: "FurniCraft Traders", type: "vendor", city: "Jaipur" } });
    check("creates contact", newContact.status === 201, JSON.stringify(newContact.json));

    const badProduct = await api("POST", "/products", { token: adminToken, body: { name: "X", type: "goods", salesPrice: -5 } });
    check("rejects negative price", badProduct.status === 400);

    const newProduct = await api("POST", "/products", { token: adminToken, body: { name: "Reading Lamp", type: "goods", salesPrice: 2400, costPrice: 1300 } });
    check("creates product", newProduct.status === 201);

    // --- Purchase cycle --------------------------------------------------------
    console.log("purchase cycle");
    const vendors = await api("GET", "/contacts", { token: adminToken });
    const vendor = vendors.json.find((c) => c.name === "Azure Furniture");
    const products = (await api("GET", "/products", { token: adminToken })).json;
    const officeChair = products.find((p) => p.name === "Office Chair");
    const lamp = newProduct.json;

    const po = await api("POST", "/purchase-orders", {
      token: adminToken,
      body: { vendorId: vendor.id, orderDate: "2026-09-05", status: "draft", lines: [{ productId: officeChair.id, qty: 6, unitPrice: 4100 }] },
    });
    check("creates PO as draft", po.status === 201 && po.json.status === "draft", JSON.stringify(po.json));
    check("PO total computed", po.json.totalAmount === 24600);

    const poConfirmed = await api("POST", `/purchase-orders/${po.json.id}/confirm`, { token: adminToken });
    check("confirms PO", poConfirmed.json.status === "confirmed");

    const converted = await api("POST", `/purchase-orders/${po.json.id}/convert`, { token: adminToken, body: { billDate: "2026-09-05" } });
    check("converts PO to bill", converted.status === 201 && converted.json.bill.status === "posted", JSON.stringify(converted.json));
    const billId = converted.json.bill.id;

    const poLocked = await api("PUT", `/purchase-orders/${po.json.id}`, {
      token: adminToken,
      body: { vendorId: vendor.id, lines: [{ productId: officeChair.id, qty: 9, unitPrice: 4100 }] },
    });
    check("locks billed PO against edits", poLocked.status === 400);

    const overpay = await api("POST", `/vendor-bills/${billId}/pay`, { token: adminToken, body: { amount: 999999, method: "bank" } });
    check("rejects overpayment", overpay.status === 400);

    const billPay = await api("POST", `/vendor-bills/${billId}/pay`, { token: adminToken, body: { amount: 24600, method: "bank", paymentDate: "2026-09-06" } });
    check("pays bill fully", billPay.status === 201 && billPay.json.updatedBill.status === "paid");

    // --- Sales cycle ------------------------------------------------------------
    console.log("sales cycle");
    const customers = await api("GET", "/contacts", { token: adminToken });
    const nimesh = customers.json.find((c) => c.name === "Nimesh Pathak");

    const so = await api("POST", "/sales-orders", {
      token: adminToken,
      body: {
        customerId: nimesh.id,
        orderDate: "2026-09-06",
        lines: [{ productId: officeChair.id, qty: 5, unitPrice: 7200, taxPercent: 18 }],
      },
    });
    check("creates SO with tax", so.status === 201 && so.json.totalAmount === 42480 && so.json.taxAmount === 6480, JSON.stringify(so.json));

    const soConfirmed = await api("POST", `/sales-orders/${so.json.id}/confirm`, { token: adminToken });
    check("confirms SO", soConfirmed.json.status === "confirmed");

    const generated = await api("POST", `/sales-orders/${so.json.id}/generate`, { token: adminToken, body: { invoiceDate: "2026-09-06" } });
    check("generates invoice", generated.status === 201 && generated.json.invoice.status === "posted", JSON.stringify(generated.json));
    const invoiceId = generated.json.invoice.id;

    const invoicePay = await api("POST", `/customer-invoices/${invoiceId}/pay`, {
      token: adminToken,
      body: { amount: 20000, method: "cash", paymentDate: "2026-09-07" },
    });
    check("partial invoice payment", invoicePay.status === 201 && invoicePay.json.updatedInvoice.status === "posted" && invoicePay.json.updatedInvoice.paidAmount === 20000);

    // --- Ledger integrity --------------------------------------------------------
    console.log("ledger");
    const entries = await prismaJournalEntries();
    check("every entry balanced", entries.every((e) => Math.abs(e.lines.reduce((a, l) => a + l.debit, 0) - e.lines.reduce((a, l) => a + l.credit, 0)) < 0.001));

    // --- Reports -----------------------------------------------------------------
    console.log("reports");
    const bs = await api("GET", "/reports/balance-sheet", { token: acctToken });
    check("balance sheet balances", bs.json.balanced === true, JSON.stringify(bs.json));
    check("balance sheet has asset total", bs.json.totalAssets > 0);

    const pnl = await api("GET", "/reports/pnl", { token: acctToken, body: undefined });
    check("P&L net profit equals income - expense", Math.abs(pnl.json.netProfit - (pnl.json.totalIncome - pnl.json.totalExpenses)) < 0.001);

    const budget = await api("GET", "/reports/budget", { token: acctToken });
    const mkt = budget.json.find((b) => b.name.includes("Marketing"));
    check("budget report shows actual spend", mkt && mkt.actualAmount > 0 && mkt.plannedAmount === 60000, JSON.stringify(budget.json));

    const dash = await api("GET", "/reports/dashboard", { token: acctToken });
    check("dashboard reports KPIs", dash.json.totalReceivable > 0 && typeof dash.json.cashBankBalance === "number");

    // --- Contact portal ------------------------------------------------------------
    console.log("contact portal");
    const docs = await api("GET", "/me/documents", { token: contactToken });
    check("contact sees own invoice", docs.status === 200 && docs.json.invoices.some((i) => i.customer.name === "Nimesh Pathak"));
    check("contact has outstanding due", docs.json.totalDue > 0);

    const openInvoice = docs.json.invoices.find((i) => i.status !== "paid");
    const portalPay = await api("POST", "/me/pay", { token: contactToken, body: { invoiceId: openInvoice.id, amount: openInvoice.totalAmount - openInvoice.paidAmount, method: "bank", paymentDate: "2026-09-07" } });
    check("contact pays own invoice", portalPay.status === 201 && portalPay.json.updatedInvoice.status === "paid");

    const forbiddenPay = await api("POST", "/me/pay", { token: contactToken, body: { invoiceId: invoiceId + 500, amount: 100, method: "bank" } });
    check("cannot pay someone else's invoice", forbiddenPay.status === 403 || forbiddenPay.status === 404);

    // Vendor contact read-only
    const vendorToken = await login("azure@azurefurniture.com", "contact123");
    const vendorDocs = await api("GET", "/me/documents", { token: vendorToken });
    check("vendor sees own bills", vendorDocs.json.bills.length > 0);

    console.log("");
    console.log(`Smoke test done: ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  } catch (e) {
    console.error("Smoke test crashed:", e);
    process.exit(1);
  }
});

async function prismaJournalEntries() {
  const { PrismaClient } = await import("@prisma/client");
  const pc = new PrismaClient();
  const rows = await pc.journalEntry.findMany({ include: { lines: true } });
  await pc.$disconnect();
  return rows;
}