import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { FileText, History, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./ui";

const NAV = [
  { to: "/my", label: "My documents", icon: FileText, end: true },
  { to: "/my/history", label: "Payment history", icon: History },
];

export default function ContactLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="no-print hidden w-[236px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-walnut-600 text-[15px] font-bold text-white">
            UF
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight text-ink">Urban Furniture</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-walnut-600">Partner portal</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium transition-colors ${
                  isActive ? "bg-walnut-600/10 text-walnut-800" : "text-ink-soft hover:bg-paper-deep/70 hover:text-ink"
                }`
              }
            >
              <item.icon className="h-[17px] w-[17px]" strokeWidth={1.7} aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line px-3 py-3">
          <p className="rounded-lg bg-paper px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-mute">
            Questions about an invoice? Write to accounts@urbanfurniture.com
          </p>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-[264px] flex-col bg-surface shadow-pop">
            <button onClick={() => setMobileOpen(false)} className="absolute right-2 top-2 p-1.5 text-ink-mute" aria-label="Close menu">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-walnut-600 text-[15px] font-bold text-white">UF</div>
              <p className="text-[15px] font-semibold tracking-tight text-ink">Urban Furniture</p>
            </div>
            <nav className="flex-1 space-y-0.5 px-3">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium ${isActive ? "bg-walnut-600/10 text-walnut-800" : "text-ink-soft"}`}
                >
                  <item.icon className="h-[17px] w-[17px]" strokeWidth={1.7} /> {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-1.5 text-ink-soft hover:bg-paper-deep lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <p className="hidden text-[13px] font-medium text-ink-mute sm:block">
            Welcome back, <span className="text-ink">{user?.name}</span>
          </p>
          <div className="ml-auto flex items-center gap-3">
            <Avatar name={user?.name} size={30} />
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2 py-1.5 text-[13px] font-medium text-ink-mute hover:bg-paper-deep hover:text-clay-600"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1080px] px-4 py-6 sm:px-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}