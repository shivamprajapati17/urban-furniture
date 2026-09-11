import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../lib/auth.js";
import { round2, sum } from "../lib/money.js";
import { postCustomerInvoice } from "../lib/ledger.js";
import { payInvoice } from "../lib/payments.js";
import { attachEffectiveStatus } from "../lib/status.js";

const router = Router();
router.use(requireAuth, requireStaff);

const SO_INCLUDE = {
  customer: true,
  lines: { include: { product: true } },
  analyticAccount: true,
  customerInvoice: true,
};
const SO_ORDER = { orderDate: "desc" };

function buildLines(body) {
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    throw Object.assign(new Error("At least one line item is required."), { status: 400 });
  }
  return body.lines.map((l) => {
    const qty = Number(l.qty);
    const unitPrice = Number(l.unitPrice);
    const taxPercent = Number(l.taxPercent || 0);
    if (!(qty > 0)) throw Object.assign(new Error("Quantity must be greater than zero."), { status: 400 });
    if (!(unitPrice >= 0)) throw Object.assign(new Error("Unit price must be zero or more."), { status: 400 });
    if (taxPercent < 0) throw Object.assign(new Error("Tax cannot be negative."), { status: 400 });
    return { productId: Number(l.productId), qty, unitPrice, taxPercent, subtotal: round2(qty * unitPrice) };
  });
}

async function assertCustomer(contactId) {
  const contact = await prisma.contact.findUnique({ where: { id: Number(contactId) } });
  if (!contact) throw Object.assign(new Error("Customer contact not found."), { status: 400 });
  if (contact.isArchived) throw Object.assign(new Error("Archived contacts cannot be used in new transactions."), { status: 400 });
  if (!["customer", "both"].includes(contact.type)) {
    throw Object.assign(new Error(`${contact.name} is not set up as a customer.`), { status: 400 });
  }
  return contact;
}

async function assertProductActive(productId) {
  const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
  if (!product) throw Object.assign(new Error("Product not found."), { status: 400 });
  if (product.isArchived) throw Object.assign(new Error("Archived products cannot be used in new transactions."), { status: 400 });
  return product;
}

// ------------------------------ Sales orders ------------------------------

router.get("/", async (_req, res) => {
  const orders = await prisma.salesOrder.findMany({ include: SO_INCLUDE, orderBy: SO_ORDER });
  res.json(orders);
});

router.get("/:id", async (req, res) => {
  const order = await prisma.salesOrder.findUnique({
    where: { id: Number(req.params.id) },
    include: SO_INCLUDE,
  });
  if (!order) return res.status(404).json({ error: "Sales order not found." });
  res.json(order);
});

router.post("/", async (req, res) => {
  try {
    const customer = await assertCustomer(req.body.customerId);
    const lines = buildLines(req.body);
    for (const l of lines) await assertProductActive(l.productId);
    const subtotal = sum(lines.map((l) => l.subtotal));
    const taxAmount = sum(lines.map((l) => round2(l.subtotal * (l.taxPercent / 100))));
    const order = await prisma.salesOrder.create({
      data: {
        customerId: customer.id,
        orderDate: new Date(req.body.orderDate || new Date()),
        status: req.body.status === "confirmed" ? "confirmed" : "draft",
        totalAmount: round2(subtotal + taxAmount),
        taxAmount,
        analyticAccountId: req.body.analyticAccountId ? Number(req.body.analyticAccountId) : null,
        lines: { create: lines },
      },
      include: SO_INCLUDE,
    });
    res.status(201).json(order);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.salesOrder.findUnique({ where: { id }, include: { customerInvoice: true } });
    if (!existing) return res.status(404).json({ error: "Sales order not found." });
    if (existing.status === "invoiced") {
      return res.status(400).json({ error: "This order was invoiced and can no longer be edited." });
    }
    const customer = await assertCustomer(req.body.customerId);
    const lines = buildLines(req.body);
    for (const l of lines) await assertProductActive(l.productId);
    const subtotal = sum(lines.map((l) => l.subtotal));
    const taxAmount = sum(lines.map((l) => round2(l.subtotal * (l.taxPercent / 100))));
    const order = await prisma.$transaction(async (tx) => {
      await tx.salesOrderLine.deleteMany({ where: { soId: id } });
      return tx.salesOrder.update({
        where: { id },
        data: {
          customerId: customer.id,
          orderDate: new Date(req.body.orderDate || existing.orderDate),
          status: req.body.status === "confirmed" ? "confirmed" : existing.status,
          totalAmount: round2(subtotal + taxAmount),
          taxAmount,
          analyticAccountId: req.body.analyticAccountId !== undefined ? (req.body.analyticAccountId ? Number(req.body.analyticAccountId) : null) : existing.analyticAccountId,
          lines: { create: lines },
        },
        include: SO_INCLUDE,
      });
    });
    res.json(order);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

router.post("/:id/confirm", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.salesOrder.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Sales order not found." });
  if (existing.status === "invoiced") return res.status(400).json({ error: "Order already invoiced." });
  const order = await prisma.salesOrder.update({ where: { id }, data: { status: "confirmed" }, include: SO_INCLUDE });
  res.json(order);
});

// Generate invoice from confirmed SO: Dr Debtor / Cr Sale Income / Cr Tax Payable.
router.post("/:id/generate", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { customer: true, lines: { include: { product: true } }, analyticAccount: true },
    });
    if (!order) return res.status(404).json({ error: "Sales order not found." });
    if (order.status !== "confirmed") {
      return res.status(400).json({ error: "Confirm the order before generating an invoice." });
    }
    if (order.customerInvoice) return res.status(400).json({ error: "This order already has an invoice." });

    const invoiceDate = new Date(req.body.invoiceDate || new Date());
    const dueDate = new Date(req.body.dueDate || new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000));
    const subtotal = sum(order.lines.map((l) => l.subtotal));

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.customerInvoice.create({
        data: {
          soId: order.id,
          customerId: order.customerId,
          invoiceDate,
          dueDate,
          status: "posted",
          totalAmount: order.totalAmount,
          taxAmount: order.taxAmount,
          paidAmount: 0,
        },
      });
      await tx.salesOrder.update({ where: { id: order.id }, data: { status: "invoiced" } });
      await postCustomerInvoice(tx, {
        invoiceId: invoice.id,
        subtotal,
        tax: order.taxAmount,
        date: invoiceDate,
        analyticAccountId: order.analyticAccountId,
      });
      return tx.customerInvoice.findUnique({
        where: { id: invoice.id },
        include: { customer: true, so: { include: { lines: { include: { product: true } } } }, payments: true },
      });
    });
    res.status(201).json({ invoice: attachEffectiveStatus([result])[0], orderId: order.id });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

// ---------------------------- Customer invoices ---------------------------

// Mounted at /api/customer-invoices (see index.js).
export const invoicesRouter = Router();
invoicesRouter.use(requireAuth, requireStaff);

invoicesRouter.get("/", async (_req, res) => {
  const invoices = await prisma.customerInvoice.findMany({
    include: { customer: true, so: { include: { lines: { include: { product: true } } } }, payments: true },
    orderBy: { invoiceDate: "desc" },
  });
  res.json(attachEffectiveStatus(invoices));
});

invoicesRouter.get("/:id", async (req, res) => {
  const invoice = await prisma.customerInvoice.findUnique({
    where: { id: Number(req.params.id) },
    include: { customer: true, so: { include: { lines: { include: { product: true } } } }, payments: { include: { contact: true } } },
  });
  if (!invoice) return res.status(404).json({ error: "Invoice not found." });
  res.json(attachEffectiveStatus([invoice])[0]);
});

// Register payment against an invoice: Dr Bank|Cash / Cr Debtor.
invoicesRouter.post("/:id/pay", async (req, res) => {
  try {
    const updated = await payInvoice({
      invoiceId: Number(req.params.id),
      amount: req.body.amount,
      method: req.body.method,
      paymentDate: req.body.paymentDate,
    });
    res.status(201).json(updated);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

export default router;