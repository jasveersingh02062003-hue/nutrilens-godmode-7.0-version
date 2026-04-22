import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, MessageSquare, ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users, end: false },
  { to: '/admin/plans', label: 'Plans', icon: FileText, end: false },
  { to: '/admin/feedback', label: 'Feedback', icon: MessageSquare, end: false },
  { to: '/admin/audit', label: 'Audit Logs', icon: ShieldAlert, end: false, superOnly: true },
];

export default function AdminLayout() {
  const { isSuperAdmin } = useAdminRole();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">NutriLens Admin</span>
          </div>
          {isSuperAdmin && (
            <Badge variant="secondary" className="mt-2 text-[10px]">SUPER ADMIN</Badge>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {NAV.filter(n => !n.superOnly || isSuperAdmin).map(item => (
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
