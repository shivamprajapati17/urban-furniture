import { prisma } from "./prisma.js";
import { round2 } from "./money.js";
import { postPaymentIn, postPaymentOut } from "./ledger.js";

export class PaymentError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

export function validMethod(m) {
  return ["cash", "bank"].includes(m) ? m : "bank";
}

/**
 * Record a payment received against a customer invoice.
 * Ledger: Dr Bank|Cash / Cr Debtor.
 */
export async function payInvoice({ invoiceId, amount, method, paymentDate }) {
  const invoice = await prisma.customerInvoice.findUnique({ where: { id: invoiceId }, include: { customer: true } });
  if (!invoice) throw new PaymentError("Invoice not found.");

  const amt = round2(Number(amount));
  if (!(amt > 0)) throw new PaymentError("Amount must be greater than zero.");
  const outstanding = round2(invoice.totalAmount - invoice.paidAmount);
  if (amt > outstanding + 0.001) {
    throw new PaymentError(`Payment exceeds outstanding balance of ${outstanding.toFixed(2)}.`);
  }
  const date = new Date(paymentDate || new Date());
  const m = validMethod(method);

  return prisma.$transaction(async (tx) => {
    await postPaymentIn(tx, { invoiceId: invoice.id, contactId: invoice.customerId, method: m, amount: amt, date });
    const payment = await tx.payment.create({
      data: { direction: "in", contactId: invoice.customerId, invoiceId: invoice.id, method: m, amount: amt, paymentDate: date },
    });
    const paidAmount = round2(invoice.paidAmount + amt);
    const status = paidAmount >= invoice.totalAmount - 0.001 ? "paid" : invoice.status;
    const updatedInvoice = await tx.customerInvoice.update({ where: { id: invoice.id }, data: { paidAmount, status } });
    return { payment, updatedInvoice };
  });
}

/**
 * Record a payment made against a vendor bill.
 * Ledger: Dr Creditor / Cr Bank|Cash.
 */
export async function payBill({ billId, amount, method, paymentDate }) {
  const bill = await prisma.vendorBill.findUnique({ where: { id: billId }, include: { vendor: true } });
  if (!bill) throw new PaymentError("Vendor bill not found.");

  const amt = round2(Number(amount));
  if (!(amt > 0)) throw new PaymentError("Amount must be greater than zero.");
  const outstanding = round2(bill.totalAmount - bill.paidAmount);
  if (amt > outstanding + 0.001) {
    throw new PaymentError(`Payment exceeds outstanding balance of ${outstanding.toFixed(2)}.`);
  }
  const date = new Date(paymentDate || new Date());
  const m = validMethod(method);

  return prisma.$transaction(async (tx) => {
    await postPaymentOut(tx, { billId: bill.id, contactId: bill.vendorId, method: m, amount: amt, date });
    const payment = await tx.payment.create({
      data: { direction: "out", contactId: bill.vendorId, billId: bill.id, method: m, amount: amt, paymentDate: date },
    });
    const paidAmount = round2(bill.paidAmount + amt);
    const status = paidAmount >= bill.totalAmount - 0.001 ? "paid" : bill.status;
    const updatedBill = await tx.vendorBill.update({ where: { id: bill.id }, data: { paidAmount, status } });
    return { payment, updatedBill };
  });
}