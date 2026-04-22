import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, MessageSquare, ShieldAlert, ArrowLeft, LogOut,
  Activity, IndianRupee, Megaphone, Building2, Database, UserCog, Wallet, ListChecks,
} from 'lucide-react';
import { useAdminRole, type StaffRole } from '@/hooks/useAdminRole';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end: boolean;
  /** Roles allowed to see this item. Admin/owner/super_admin always see everything. */
  roles?: Array<Exclude<StaffRole, 'brand_manager'>>;
  ownerOnly?: boolean;
  superOnly?: boolean;
};

// Visibility matrix from PDF §7.3
const NAV: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users, end: false, roles: ['owner', 'super_admin', 'admin', 'marketer', 'support'] },
  { to: '/admin/staff', label: 'Staff & Roles', icon: UserCog, end: false, ownerOnly: true },
  { to: '/admin/retention', label: 'Retention', icon: Activity, end: false, roles: ['owner', 'super_admin', 'admin', 'marketer'] },
  { to: '/admin/revenue', label: 'Revenue', icon: IndianRupee, end: false, roles: ['owner', 'super_admin', 'admin'] },
  { to: '/admin/costs', label: 'Costs & Profit', icon: Wallet, end: false, roles: ['owner', 'super_admin', 'admin'] },
  { to: '/admin/ads', label: 'Ads', icon: Megaphone, end: false, roles: ['owner', 'super_admin', 'admin', 'marketer'] },
  { to: '/admin/brands', label: 'Brands', icon: Building2, end: false, roles: ['owner', 'super_admin', 'admin', 'marketer'] },
  { to: '/admin/plans', label: 'Plans', icon: FileText, end: false, roles: ['owner', 'super_admin', 'admin'] },
  { to: '/admin/feedback', label: 'Feedback', icon: MessageSquare, end: false, roles: ['owner', 'super_admin', 'admin', 'support'] },
  { to: '/admin/scraping', label: 'Scraping', icon: Database, end: false, roles: ['owner', 'super_admin', 'admin'] },
  { to: '/admin/ops', label: 'Ops Checklist', icon: ListChecks, end: false, roles: ['owner', 'super_admin', 'admin'] },
  { to: '/admin/audit', label: 'Audit Logs', icon: ShieldAlert, end: false, superOnly: true },
];

function canSee(item: NavItem, r: ReturnType<typeof useAdminRole>) {
  if (item.ownerOnly) return r.isOwner;
  if (item.superOnly) return r.isSuperAdmin || r.isOwner;
  if (!item.roles) return true;
  return (
    (r.isOwner && item.roles.includes('owner')) ||
    (r.isSuperAdmin && item.roles.includes('super_admin')) ||
    (r.roles.includes('admin') && item.roles.includes('admin')) ||
    (r.isMarketer && item.roles.includes('marketer')) ||
    (r.isSupport && item.roles.includes('support'))
  );
}

export default function AdminLayout() {
  const role = useAdminRole();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const badgeLabel = role.isOwner ? 'OWNER'
    : role.isSuperAdmin ? 'SUPER ADMIN'
    : role.roles.includes('admin') ? 'ADMIN'
    : role.isMarketer ? 'MARKETER'
    : role.isSupport ? 'SUPPORT'
    : null;

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">NutriLens Admin</span>
          </div>
          {badgeLabel && (
            <Badge variant="secondary" className="mt-2 text-[10px]">{badgeLabel}</Badge>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {NAV.filter(n => canSee(n, role)).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <div className="px-2 py-1 text-[11px] text-muted-foreground truncate">
            {user?.email}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to app
          </button>
          <button
            onClick={async () => { await logout(); navigate('/auth'); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
