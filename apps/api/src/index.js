import express from "express";
import cors from "cors";
import { pathToFileURL } from "url";

import authRoutes from "./routes/auth.js";
import metaRoutes from "./routes/meta.js";
import contactRoutes from "./routes/contacts.js";
import productRoutes from "./routes/products.js";
import accountRoutes from "./routes/accounts.js";
import analyticRoutes, { budgetsRouter } from "./routes/analytics.js";
import purchaseRoutes, { billsRouter } from "./routes/purchaseOrders.js";
import salesRoutes, { invoicesRouter } from "./routes/salesOrders.js";
import paymentRoutes from "./routes/payments.js";
import reportRoutes from "./routes/reports.js";
import meRoutes from "./routes/me.js";
import userRoutes from "./routes/users.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "urban-furniture-api" }));

app.use("/api/auth", authRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/products", productRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/analytic-accounts", analyticRoutes);
app.use("/api/budgets", budgetsRouter);
app.use("/api/purchase-orders", purchaseRoutes);
app.use("/api/vendor-bills", billsRouter);
app.use("/api/sales-orders", salesRoutes);
app.use("/api/customer-invoices", invoicesRouter);
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/me", meRoutes);
app.use("/api/users", userRoutes);

// 404 + error handler
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

export default app;

// Only listen when run directly (not when imported by tests/smoke scripts).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const PORT = Number(process.env.PORT || 4000);
  app.listen(PORT, () => {
    console.log(`Urban Furniture API running on http://localhost:${PORT}`);
  });
}