import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppLayout from "./components/AppLayout";
import ContactLayout from "./components/ContactLayout";

import Login from "./pages/Login";
import VerifyFace from "./pages/VerifyFace";
import Dashboard from "./pages/Dashboard";
import ContactsPage from "./pages/master/ContactsPage";
import ProductsPage from "./pages/master/ProductsPage";
import AccountsPage from "./pages/master/AccountsPage";
import JournalsPage from "./pages/master/JournalsPage";
import AnalyticsPage from "./pages/master/AnalyticsPage";
import PurchaseOrdersPage from "./pages/purchases/PurchaseOrdersPage";
import VendorBillsPage from "./pages/purchases/VendorBillsPage";
import SalesOrdersPage from "./pages/sales/SalesOrdersPage";
import CustomerInvoicesPage from "./pages/sales/CustomerInvoicesPage";
import PaymentsPage from "./pages/PaymentsPage";
import BalanceSheetPage from "./pages/reports/BalanceSheetPage";
import ProfitLossPage from "./pages/reports/ProfitLossPage";
import BudgetReportPage from "./pages/reports/BudgetReportPage";
import ContactHome from "./pages/contact/ContactHome";
import ContactHistory from "./pages/contact/ContactHistory";
import NotFound from "./pages/NotFound";
import MasterKanban from "./pages/kanban/MasterKanban";
import UsersPage from "./pages/UsersPage";

function StaffGate({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "contact") return <Navigate to="/my" replace />;
  return children;
}

function ContactGate({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "contact") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify-face" element={<VerifyFace />} />

      {/* Staff / back-office */}
      <Route
        element={
          <StaffGate>
            <AppLayout />
          </StaffGate>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="kanban" element={<MasterKanban />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="journals" element={<JournalsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="vendor-bills" element={<VendorBillsPage />} />
        <Route path="sales-orders" element={<SalesOrdersPage />} />
        <Route path="customer-invoices" element={<CustomerInvoicesPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="reports/balance-sheet" element={<BalanceSheetPage />} />
        <Route path="reports/pnl" element={<ProfitLossPage />} />
        <Route path="reports/budget" element={<BudgetReportPage />} />
      </Route>

      {/* Contact self-service portal */}
      <Route
        element={
          <ContactGate>
            <ContactLayout />
          </ContactGate>
        }
      >
        <Route path="my" element={<ContactHome />} />
        <Route path="my/history" element={<ContactHistory />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}