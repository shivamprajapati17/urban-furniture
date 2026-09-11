// Seed script for the Urban Furniture demo.
// Re-runnable: wipes all tables, then recreates master data + demo transactions
// through the same ledger engine the API uses.
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma.js";
import { round2 } from "./lib/money.js";
import { postVendorBill, postCustomerInvoice, postPaymentIn, postPaymentOut } from "./lib/ledger.js";

const day = (iso) => new Date(`${iso}T00:00:00.000Z`);

async function wipe() {
  await prisma.journalEntryLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.customerInvoice.deleteMany();
  await prisma.vendorBill.deleteMany();
  await prisma.salesOrderLine.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.analyticAccount.deleteMany();
  await prisma.user.deleteMany();
  await prisma.product.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.journal.deleteMany();
  await prisma.account.deleteMany();
}

async function main() {
  await wipe();
  console.log("Seeding Urban Furniture demo data...");

  const hash = (pw) => bcrypt.hash(pw, 10);

  // ------------------------------- Master data -------------------------------

  const [cash, bank, debtors, creditors, taxPayable, saleIncome, purchaseExpense, ownerCapital, marketingExpense, storeRent] =
    await Promise.all([
      prisma.account.create({ data: { name: "Cash", type: "asset" } }),
      prisma.account.create({ data: { name: "Bank", type: "asset" } }),
      prisma.account.create({ data: { name: "Debtors", type: "asset" } }),
      prisma.account.create({ data: { name: "Creditors", type: "liability" } }),
      prisma.account.create({ data: { name: "Tax Payable", type: "liability" } }),
      prisma.account.create({ data: { name: "Sale Income", type: "income" } }),
      prisma.account.create({ data: { name: "Purchase Expense", type: "expense" } }),
      prisma.account.create({ data: { name: "Owner's Capital", type: "capital" } }),
      prisma.account.create({ data: { name: "Marketing Expense", type: "expense" } }),
      prisma.account.create({ data: { name: "Store Rent Expense", type: "expense" } }),
    ]);

  await Promise.all([
    prisma.journal.create({ data: { name: "Sales Journal", type: "sales", defaultAccountId: saleIncome.id } }),
    prisma.journal.create({ data: { name: "Purchase Journal", type: "purchase", defaultAccountId: purchaseExpense.id } }),
    prisma.journal.create({ data: { name: "Bank Journal", type: "bank", defaultAccountId: bank.id } }),
    prisma.journal.create({ data: { name: "Cash Journal", type: "cash", defaultAccountId: cash.id } }),
  ]);

  const [azureFurniture, nimeshPathak, malabarWoods, casaVerde] = await Promise.all([
    prisma.contact.create({
      data: {
        name: "Azure Furniture",
        type: "vendor",
        email: "azure@azurefurniture.com",
        mobile: "+91 98220 44881",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Nimesh Pathak",
        type: "customer",
        email: "nimesh@pathak.com",
        mobile: "+91 98450 12347",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560001",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Malabar Woods",
        type: "both",
        email: "info@malabarwoods.in",
        mobile: "+91 98675 22190",
        city: "Kochi",
        state: "Kerala",
        pincode: "682020",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Casa Verde Interiors",
        type: "customer",
        email: "hello@casaverde.in",
        mobile: "+91 99000 77112",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400050",
      },
    }),
  ]);

  const [officeChair, woodenChair, teakTable, sofaSet, assembly, promoDisplay] = await Promise.all([
    prisma.product.create({ data: { name: "Office Chair", type: "goods", salesPrice: 7200, costPrice: 4100, category: "Seating" } }),
    prisma.product.create({ data: { name: "Wooden Chair", type: "goods", salesPrice: 4500, costPrice: 2800, category: "Seating" } }),
    prisma.product.create({ data: { name: "Teak Dining Table", type: "goods", salesPrice: 38500, costPrice: 24000, category: "Tables" } }),
    prisma.product.create({ data: { name: "Sofa Set (3-Seater)", type: "goods", salesPrice: 64000, costPrice: 42000, category: "Sofas" } }),
    prisma.product.create({ data: { name: "Assembly Service", type: "service", salesPrice: 1500, costPrice: 0, category: "Services" } }),
    prisma.product.create({ data: { name: "In-store Promo Display", type: "goods", salesPrice: 4800, costPrice: 3200, category: "Marketing" } }),
  ]);

  // Users (contact-linked logins power the customer/vendor portal).
  await Promise.all([
    prisma.user.create({
      data: { name: "Rohan Deshmukh", email: "admin@urbanfurniture.com", passwordHash: await hash("admin123"), role: "admin" },
    }),
    prisma.user.create({
      data: { name: "Priya Nair", email: "accountant@urbanfurniture.com", passwordHash: await hash("accountant123"), role: "accountant" },
    }),
    prisma.user.create({
      data: { name: "Nimesh Pathak", email: "nimesh@pathak.com", passwordHash: await hash("contact123"), role: "contact", contactId: nimeshPathak.id },
    }),
    prisma.user.create({
      data: { name: "Azure Furniture", email: "azure@azurefurniture.com", passwordHash: await hash("contact123"), role: "contact", contactId: azureFurniture.id },
    }),
  ]);

  const [onlineSales, showroomSales, marketingAnalytic, storeRentAnalytic] = await Promise.all([
    prisma.analyticAccount.create({ data: { name: "Online Sales", type: "income" } }),
    prisma.analyticAccount.create({ data: { name: "Showroom Sales", type: "income" } }),
    prisma.analyticAccount.create({ data: { name: "Marketing", type: "expense" } }),
    prisma.analyticAccount.create({ data: { name: "Store Rent", type: "expense" } }),
  ]);

  await Promise.all([
    prisma.budget.create({
      data: {
        name: "Marketing FY 2026-27",
        periodStart: day("2026-04-01"),
        periodEnd: day("2027-03-31"),
        responsiblePerson: "Priya Nair",
        plannedAmount: 60000,
        analyticAccountId: marketingAnalytic.id,
      },
    }),
    prisma.budget.create({
      data: {
        name: "Store Rent FY 2026-27",
        periodStart: day("2026-04-01"),
        periodEnd: day("2027-03-31"),
        responsiblePerson: "Rohan Deshmukh",
        plannedAmount: 360000,
        analyticAccountId: storeRentAnalytic.id,
      },
    }),
  ]);

  // ------------------------------ Demo cycles ------------------------------

  // Purchase cycle: PO-1001 -> bill -> paid from bank. (Teak tables + office chairs)
  const po1 = await prisma.purchaseOrder.create({
    data: {
      vendorId: azureFurniture.id,
      orderDate: day("2026-08-10"),
      status: "confirmed",
      totalAmount: round2(10 * 4100 + 2 * 24000),
      lines: {
        create: [
          { productId: officeChair.id, qty: 10, unitPrice: 4100, subtotal: 41000 },
          { productId: teakTable.id, qty: 2, unitPrice: 24000, subtotal: 48000 },
        ],
      },
    },
  });

  const bill1 = await prisma.$transaction(async (tx) => {
    const bill = await tx.vendorBill.create({
      data: {
        poId: po1.id,
        vendorId: azureFurniture.id,
        billDate: day("2026-08-12"),
        dueDate: day("2026-09-01"),
        status: "posted",
        totalAmount: po1.totalAmount,
        paidAmount: 0,
      },
    });
    await tx.purchaseOrder.update({ where: { id: po1.id }, data: { status: "billed" } });
    await postVendorBill(tx, { billId: bill.id, total: po1.totalAmount, date: day("2026-08-12"), analyticAccountId: null });
    return bill;
  });

  await prisma.$transaction(async (tx) => {
    await postPaymentOut(tx, { billId: bill1.id, contactId: azureFurniture.id, method: "bank", amount: po1.totalAmount, date: day("2026-08-20") });
    await tx.payment.create({
      data: { direction: "out", contactId: azureFurniture.id, billId: bill1.id, method: "bank", amount: po1.totalAmount, paymentDate: day("2026-08-20") },
    });
    await tx.vendorBill.update({ where: { id: bill1.id }, data: { paidAmount: po1.totalAmount, status: "paid" } });
  });

  // Open purchase (unpaid): promo displays tagged to the Marketing analytic.
  const po2 = await prisma.purchaseOrder.create({
    data: {
      vendorId: azureFurniture.id,
      orderDate: day("2026-08-25"),
      status: "confirmed",
      totalAmount: round2(8 * 3200),
      analyticAccountId: marketingAnalytic.id,
      lines: { create: [{ productId: promoDisplay.id, qty: 8, unitPrice: 3200, subtotal: 25600 }] },
    },
  });

  const bill2 = await prisma.$transaction(async (tx) => {
    const bill = await tx.vendorBill.create({
      data: {
        poId: po2.id,
        vendorId: azureFurniture.id,
        billDate: day("2026-08-26"),
        dueDate: day("2026-09-10"),
        status: "posted",
        totalAmount: po2.totalAmount,
        paidAmount: 0,
      },
    });
    await tx.purchaseOrder.update({ where: { id: po2.id }, data: { status: "billed" } });
    await postVendorBill(tx, { billId: bill.id, total: po2.totalAmount, date: day("2026-08-26"), analyticAccountId: marketingAnalytic.id });
    return bill;
  });

  // Sales cycle: SO-1001 -> invoice (5 office chairs, 18% tax) -> partial cash payment (overdue balance).
  const so1 = await prisma.salesOrder.create({
    data: {
      customerId: nimeshPathak.id,
      orderDate: day("2026-08-15"),
      status: "confirmed",
      totalAmount: round2(36000 + 6480),
      taxAmount: 6480,
      analyticAccountId: showroomSales.id,
      lines: { create: [{ productId: officeChair.id, qty: 5, unitPrice: 7200, taxPercent: 18, subtotal: 36000 }] },
    },
  });

  const inv1 = await prisma.$transaction(async (tx) => {
    const invoice = await tx.customerInvoice.create({
      data: {
        soId: so1.id,
        customerId: nimeshPathak.id,
        invoiceDate: day("2026-08-16"),
        dueDate: day("2026-08-30"),
        status: "posted",
        totalAmount: so1.totalAmount,
        taxAmount: so1.taxAmount,
        paidAmount: 0,
      },
    });
    await tx.salesOrder.update({ where: { id: so1.id }, data: { status: "invoiced" } });
    await postCustomerInvoice(tx, { invoiceId: invoice.id, subtotal: 36000, tax: 6480, date: day("2026-08-16"), analyticAccountId: showroomSales.id });
    return invoice;
  });

  await prisma.$transaction(async (tx) => {
    await postPaymentIn(tx, { invoiceId: inv1.id, contactId: nimeshPathak.id, method: "cash", amount: 20000, date: day("2026-08-18") });
    await tx.payment.create({
      data: { direction: "in", contactId: nimeshPathak.id, invoiceId: inv1.id, method: "cash", amount: 20000, paymentDate: day("2026-08-18") },
    });
    await tx.customerInvoice.update({ where: { id: inv1.id }, data: { paidAmount: 20000 } });
  });

  // Second sale: Casa Verde, fully paid from bank.
  const so2 = await prisma.salesOrder.create({
    data: {
      customerId: casaVerde.id,
      orderDate: day("2026-09-01"),
      status: "confirmed",
      totalAmount: round2(82000 + 14760),
      taxAmount: 14760,
      analyticAccountId: onlineSales.id,
      lines: {
        create: [
          { productId: sofaSet.id, qty: 1, unitPrice: 64000, taxPercent: 18, subtotal: 64000 },
          { productId: woodenChair.id, qty: 4, unitPrice: 4500, taxPercent: 18, subtotal: 18000 },
        ],
      },
    },
  });

  const inv2 = await prisma.$transaction(async (tx) => {
    const invoice = await tx.customerInvoice.create({
      data: {
        soId: so2.id,
        customerId: casaVerde.id,
        invoiceDate: day("2026-09-02"),
        dueDate: day("2026-10-02"),
        status: "posted",
        totalAmount: so2.totalAmount,
        taxAmount: so2.taxAmount,
        paidAmount: 0,
      },
    });
    await tx.salesOrder.update({ where: { id: so2.id }, data: { status: "invoiced" } });
    await postCustomerInvoice(tx, { invoiceId: invoice.id, subtotal: 82000, tax: 14760, date: day("2026-09-02"), analyticAccountId: onlineSales.id });
    return invoice;
  });

  await prisma.$transaction(async (tx) => {
    await postPaymentIn(tx, { invoiceId: inv2.id, contactId: casaVerde.id, method: "bank", amount: inv2.totalAmount, date: day("2026-09-03") });
    await tx.payment.create({
      data: { direction: "in", contactId: casaVerde.id, invoiceId: inv2.id, method: "bank", amount: inv2.totalAmount, paymentDate: day("2026-09-03") },
    });
    await tx.customerInvoice.update({ where: { id: inv2.id }, data: { paidAmount: inv2.totalAmount, status: "paid" } });
  });

  // Opening capital contribution so the balance sheet balances from day one.
  await prisma.$transaction(async (tx) => {
    const entry = await tx.journalEntry.create({
      data: {
        journalId: (await prisma.journal.findFirst({ where: { type: "bank" } })).id,
        entryDate: day("2026-08-01"),
        reference: "Opening capital contribution",
        sourceType: "payment",
        sourceId: 0,
        lines: {
          create: [
            { accountId: bank.id, debit: 500000 },
            { accountId: ownerCapital.id, credit: 500000 },
          ],
        },
      },
    });
    return entry;
  });

  console.log("Seeding complete.");
  console.log("");
  console.log("Demo logins:");
  console.log("  Admin       admin@urbanfurniture.com   / admin123");
  console.log("  Accountant  accountant@urbanfurniture.com / accountant123");
  console.log("  Contact     nimesh@pathak.com          / contact123  (customer)");
  console.log("  Contact     azure@azurefurniture.com   / contact123  (vendor)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });