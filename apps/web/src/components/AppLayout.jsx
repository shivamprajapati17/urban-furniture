import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ArrowDownUp,
  BookOpen,
  BookOpenCheck,
  Boxes,
  Building2,
  ChartNoAxesCombined,
  ClipboardList,
  Contact,
  FileText,
  FolderKanban,
  HandCoins,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Scale,
  ShoppingCart,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./ui";
import { ROLE_LABELS } from "../lib/constants";

const NAV = [
  { group: null, items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }] },
  {
    group: "Master data",
    items: [
      { to: "/kanban", label: "Master data", icon: ClipboardList },
      { to: "/contacts", label: "Contacts", icon: Contact },
      { to: "/products", label: "Products & services", icon: Boxes },
      { to: "/accounts", label: "Chart of accounts", icon: BookOpen },
      { to: "/journals", label: "Journals", icon: BookOpenCheck },
      { to: "/analytics", label: "Cost centres & budgets", icon: FolderKanban },
    ],
  },
  {
    group: "Purchases",
    items: [
      { to: "/purchase-orders", label: "Purchase orders", icon: ShoppingCart },
      { to: "/vendor-bills", label: "Vendor bills", icon: Receipt },
    ],
  },
  {
    group: "Sales",
    items: [
      { to: "/sales-orders", label: "Sales orders", icon: FileText },
      { to: "/customer-invoices", label: "Customer invoices", icon: Wallet },
    ],
  },
  {
    group: "Administration",
    items: [{ to: "/users", label: "Users & access", icon: Users }],
  },
  {
    group: null,
    items: [
      { to: "/payments", label: "Payments", icon: HandCoins },
      { to: "/reports/balance-sheet", label: "Reports", icon: ChartNoAxesCombined },
    ],
  },
];

const SUB_REPORTS = [
  { to: "/reports/balance-sheet", label: "Balance sheet", icon: Scale },
  { to: "/reports/pnl", label: "Profit & loss", icon: ArrowDownUp },
  { to: "/reports/budget", label: "Budget report", icon: Landmark },
];

function Brand({ onNavigate }) {
  return (
    <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-walnut-600 text-[15px] font-bold tracking-tight text-white shadow-card">
        UF
      </div>
      <div className="min-w-0 leading-tight">
        <p className="text-[15px] font-semibold tracking-tight text-ink">Urban Furniture</p>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-walnut-600">Ledger & accounts</p>
      </div>
    </div>
  );
}

function NavItem({ item, onClick }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium transition-colors ${
          isActive
            ? "bg-walnut-600/10 text-walnut-800"
            : "text-ink-soft hover:bg-paper-deep/70 hover:text-ink"
        }`
      }
    >
      <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.7} aria-hidden />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

function SidebarContent({ onNavigate }) {
  return (
    <>
      <Brand />
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {NAV.map((section, i) => (
          <div key={i}>
            {section.group && (
              <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {section.group}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) =>
                item.to === "/reports/balance-sheet" ? (
                  <div key={item.to}>
                    <NavItem item={item} onClick={onNavigate} />
                    <div className="mt-0.5 ml-4 space-y-0.5 border-l border-line pl-2.5">
                      {SUB_REPORTS.map((r) => (
                        <NavItem key={r.to} item={r} onClick={onNavigate} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <NavItem key={item.to} item={item} onClick={onNavigate} />
                )
              )}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-line px-3 py-3">
        <div className="rounded-lg bg-walnut-50 px-3 py-2.5 text-[11.5px] leading-relaxed text-walnut-800">
          Every posted transaction creates a balanced journal entry automatically.
        </div>
      </div>
    </>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="no-print hidden w-[236px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/45" onClick={closeMobile} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-[264px] flex-col bg-surface shadow-pop">
            <button onClick={closeMobile} className="absolute right-2 top-2 p-1.5 text-ink-mute" aria-label="Close menu">
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={closeMobile} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="no-print flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileOpen(true)} className="rounded-md p-1.5 text-ink-soft hover:bg-paper-deep lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 sm:flex">
              <Building2 className="h-4 w-4 text-ink-mute" strokeWidth={1.7} />
              <span className="text-[13px] font-medium text-ink-mute">Urban Furniture · Koramangala showroom</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-walnut-200 bg-walnut-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-walnut-700 sm:inline-flex">
              {ROLE_LABELS[user?.role]}
            </span>
            <div className="flex items-center gap-2 border-l border-line pl-3">
              <Avatar name={user?.name} size={30} />
              <div className="hidden leading-tight md:block">
                <p className="text-[13px] font-medium text-ink">{user?.name}</p>
                <p className="text-[11px] text-ink-mute">{user?.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-[13px] font-medium text-ink-mute transition-colors hover:border-line hover:bg-paper-deep hover:text-clay-600"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.8} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}