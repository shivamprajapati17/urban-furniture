import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../lib/auth.js";
import { payInvoice, payBill } from "../lib/payments.js";

const router = Router();
router.use(requireAuth, requireStaff);

router.get("/", async (_req, res) => {
  const payments = await prisma.payment.findMany({
    include: {
      contact: true,
      bill: true,
      invoice: true,
    },
    orderBy: { paymentDate: "desc" },
  });
  res.json(payments);
});

// Register a payment against either a customer invoice (direction in) or a vendor bill (direction out).
router.post("/", async (req, res) => {
  try {
    const { invoiceId, billId, amount, method, paymentDate } = req.body || {};
    if (!invoiceId && !billId) {
      return res.status(400).json({ error: "Specify either invoiceId or billId." });
    }
    if (invoiceId && billId) {
      return res.status(400).json({ error: "A payment can only target one document." });
    }
    const updated = invoiceId
      ? await payInvoice({ invoiceId: Number(invoiceId), amount, method, paymentDate })
      : await payBill({ billId: Number(billId), amount, method, paymentDate });
    res.status(201).json(updated);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

export default router;