import { prisma } from "./prisma.js";

// Stored status stays as-is; 'overdue' is derived at read time.
export function effectiveStatus(doc) {
  if (!doc) return null;
  if (doc.status === "paid") return "paid";
  if (doc.status === "posted" && doc.dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(doc.dueDate) < today) return "overdue";
  }
  return doc.status;
}

export function attachEffectiveStatus(docs) {
  for (const d of docs) d.status = effectiveStatus(d);
  return docs;
}

export async function updateOverdueFlags() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.vendorBill.updateMany({
    where: { status: "posted", dueDate: { lt: today } },
    data: { status: "overdue" },
  });
  await prisma.customerInvoice.updateMany({
    where: { status: "posted", dueDate: { lt: today } },
    data: { status: "overdue" },
  });
}