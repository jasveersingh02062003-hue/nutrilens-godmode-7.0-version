import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Megaphone, Wallet, Package, Plus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";

const items = [
  { to: "/brand", end: true, label: "Overview", icon: LayoutDashboard },
  { to: "/brand/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/brand/new", label: "New campaign", icon: Plus },
  { to: "/brand/billing", label: "Billing", icon: Wallet },
  { to: "/brand/products", label: "Products", icon: Package },
];

export default function BrandLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-56 border-r border-border bg-card hidden md:flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Brand portal</p>
          <NotificationBell audience="brand" />
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {items.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-border">
          <NavLink to="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-muted">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to app
          </NavLink>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
