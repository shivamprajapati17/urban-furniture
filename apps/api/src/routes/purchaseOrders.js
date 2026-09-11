import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../lib/auth.js";
import { round2, sum } from "../lib/money.js";
import { postVendorBill } from "../lib/ledger.js";
import { payBill } from "../lib/payments.js";
import { attachEffectiveStatus } from "../lib/status.js";

const router = Router();
router.use(requireAuth, requireStaff);

const PO_INCLUDE = {
  vendor: true,
  lines: { include: { product: true } },
  analyticAccount: true,
  vendorBill: true,
};
const PO_ORDER = { orderDate: "desc" };

function buildLines(body) {
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    throw Object.assign(new Error("At least one line item is required."), { status: 400 });
  }
  return body.lines.map((l) => {
    const qty = Number(l.qty);
    const unitPrice = Number(l.unitPrice);
    if (!(qty > 0)) throw Object.assign(new Error("Quantity must be greater than zero."), { status: 400 });
    if (!(unitPrice >= 0)) throw Object.assign(new Error("Unit price must be zero or more."), { status: 400 });
    return { productId: Number(l.productId), qty, unitPrice, subtotal: round2(qty * unitPrice) };
  });
}

async function assertVendor(contactId) {
  const contact = await prisma.contact.findUnique({ where: { id: Number(contactId) } });
  if (!contact) throw Object.assign(new Error("Vendor contact not found."), { status: 400 });
  if (contact.isArchived) throw Object.assign(new Error("Archived contacts cannot be used in new transactions."), { status: 400 });
  if (!["vendor", "both"].includes(contact.type)) {
    throw Object.assign(new Error(`${contact.name} is not set up as a vendor.`), { status: 400 });
  }
  return contact;
}

async function assertProductActive(productId) {
  const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
  if (!product) throw Object.assign(new Error("Product not found."), { status: 400 });
  if (product.isArchived) throw Object.assign(new Error("Archived products cannot be used in new transactions."), { status: 400 });
  return product;
}

// ----------------------------- Purchase orders -----------------------------

router.get("/", async (_req, res) => {
  const orders = await prisma.purchaseOrder.findMany({ include: PO_INCLUDE, orderBy: PO_ORDER });
  res.json(orders);
});

router.get("/:id", async (req, res) => {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: Number(req.params.id) },
    include: PO_INCLUDE,
  });
  if (!order) return res.status(404).json({ error: "Purchase order not found." });
  res.json(order);
});

router.post("/", async (req, res) => {
  try {
    const vendor = await assertVendor(req.body.vendorId);
    const lines = buildLines(req.body);
    for (const l of lines) await assertProductActive(l.productId);
    const order = await prisma.purchaseOrder.create({
      data: {
        vendorId: vendor.id,
        orderDate: new Date(req.body.orderDate || new Date()),
        status: req.body.status === "confirmed" ? "confirmed" : "draft",
        totalAmount: sum(lines.map((l) => l.subtotal)),
        analyticAccountId: req.body.analyticAccountId ? Number(req.body.analyticAccountId) : null,
        lines: { create: lines },
      },
      include: PO_INCLUDE,
    });
    res.status(201).json(order);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.purchaseOrder.findUnique({ where: { id }, include: { vendorBill: true } });
    if (!existing) return res.status(404).json({ error: "Purchase order not found." });
    if (existing.status === "billed") {
      return res.status(400).json({ error: "This order was converted to a bill and can no longer be edited." });
    }
    const vendor = await assertVendor(req.body.vendorId);
    const lines = buildLines(req.body);
    for (const l of lines) await assertProductActive(l.productId);
    const order = await prisma.$transaction(async (tx) => {
      await tx.purchaseOrderLine.deleteMany({ where: { poId: id } });
      return tx.purchaseOrder.update({
        where: { id },
        data: {
          vendorId: vendor.id,
          orderDate: new Date(req.body.orderDate || existing.orderDate),
          status: req.body.status === "confirmed" ? "confirmed" : existing.status,
          totalAmount: sum(lines.map((l) => l.subtotal)),
          analyticAccountId: req.body.analyticAccountId !== undefined ? (req.body.analyticAccountId ? Number(req.body.analyticAccountId) : null) : existing.analyticAccountId,
          lines: { create: lines },
        },
        include: PO_INCLUDE,
      });
    });
    res.json(order);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

router.post("/:id/confirm", async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Purchase order not found." });
  if (existing.status === "billed") return res.status(400).json({ error: "Order already billed." });
  const order = await prisma.purchaseOrder.update({ where: { id }, data: { status: "confirmed" }, include: PO_INCLUDE });
  res.json(order);
});

// Convert confirmed PO -> vendor bill, posting Dr Purchase Expense / Cr Creditor.
router.post("/:id/convert", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendor: true, lines: { include: { product: true } }, analyticAccount: true },
    });
    if (!order) return res.status(404).json({ error: "Purchase order not found." });
    if (order.status !== "confirmed") {
      return res.status(400).json({ error: "Confirm the order before converting it to a bill." });
    }
    if (order.vendorBill) return res.status(400).json({ error: "This order already has a bill." });

    const billDate = new Date(req.body.billDate || new Date());
    const dueDate = new Date(req.body.dueDate || new Date(billDate.getTime() + 30 * 24 * 60 * 60 * 1000));

    const result = await prisma.$transaction(async (tx) => {
      const bill = await tx.vendorBill.create({
        data: {
          poId: order.id,
          vendorId: order.vendorId,
          billDate,
          dueDate,
          status: "posted",
          totalAmount: order.totalAmount,
          paidAmount: 0,
        },
      });
      await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: "billed" } });
      await postVendorBill(tx, {
        billId: bill.id,
        total: order.totalAmount,
        date: billDate,
        analyticAccountId: order.analyticAccountId,
      });
      return tx.vendorBill.findUnique({ where: { id: bill.id }, include: { vendor: true, po: true, payments: true } });
    });
    res.status(201).json({ bill: attachEffectiveStatus([result])[0], orderId: order.id });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

// ------------------------------ Vendor bills ------------------------------

// Mounted at /api/vendor-bills (see index.js). Kept in this file because the
// conversion step (PO -> bill) shares the same business logic.
export const billsRouter = Router();
billsRouter.use(requireAuth, requireStaff);

billsRouter.get("/", async (_req, res) => {
  const bills = await prisma.vendorBill.findMany({
    include: { vendor: true, po: { include: { lines: { include: { product: true } } } }, payments: true },
    orderBy: { billDate: "desc" },
  });
  res.json(attachEffectiveStatus(bills));
});

billsRouter.get("/:id", async (req, res) => {
  const bill = await prisma.vendorBill.findUnique({
    where: { id: Number(req.params.id) },
    include: { vendor: true, po: { include: { lines: { include: { product: true } } } }, payments: { include: { contact: true } } },
  });
  if (!bill) return res.status(404).json({ error: "Vendor bill not found." });
  res.json(attachEffectiveStatus([bill])[0]);
});

// Register a payment against a vendor bill: Dr Creditor / Cr Bank|Cash.
billsRouter.post("/:id/pay", async (req, res) => {
  try {
    const updated = await payBill({
      billId: Number(req.params.id),
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