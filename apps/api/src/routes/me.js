import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { round2 } from "../lib/money.js";
import { payInvoice } from "../lib/payments.js";
import { attachEffectiveStatus } from "../lib/status.js";

const router = Router();
router.use(requireAuth);

router.get("/documents", async (req, res) => {
  if (req.user.role !== "contact" || !req.user.contactId) {
    return res.status(403).json({ error: "Contact access required." });
  }
  const contactId = req.user.contactId;
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });

  const [invoices, bills, payments] = await Promise.all([
    prisma.customerInvoice.findMany({
      where: { customerId: contactId },
      include: { customer: true, so: { include: { lines: { include: { product: true } } } }, payments: true },
      orderBy: { invoiceDate: "desc" },
    }),
    prisma.vendorBill.findMany({
      where: { vendorId: contactId },
      include: { vendor: true, po: { include: { lines: { include: { product: true } } } }, payments: true },
      orderBy: { billDate: "desc" },
    }),
    prisma.payment.findMany({ where: { contactId }, orderBy: { paymentDate: "desc" }, take: 20 }),
  ]);

  const totalDue = round2(
    [...attachEffectiveStatus(invoices), ...attachEffectiveStatus(bills)]
      .filter((d) => d.status !== "paid")
      .reduce((a, d) => a + (d.totalAmount - d.paidAmount), 0)
  );

  res.json({
    contact,
    invoices: attachEffectiveStatus(invoices),
    bills: attachEffectiveStatus(bills),
    payments,
    totalDue,
  });
});

// Contact pays their own outstanding invoice.
router.post("/pay", async (req, res) => {
  if (req.user.role !== "contact" || !req.user.contactId) {
    return res.status(403).json({ error: "Contact access required." });
  }
  try {
    const { invoiceId, amount, method, paymentDate } = req.body || {};
    if (!invoiceId) return res.status(400).json({ error: "invoiceId is required." });
    const invoice = await prisma.customerInvoice.findUnique({ where: { id: Number(invoiceId) } });
    if (!invoice || invoice.customerId !== req.user.contactId) {
      return res.status(403).json({ error: "You can only pay your own invoices." });
    }
    if (invoice.status === "paid") return res.status(400).json({ error: "This invoice is already paid." });
    const updated = await payInvoice({ invoiceId: invoice.id, amount, method, paymentDate });
    res.status(201).json(updated);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

export default router;