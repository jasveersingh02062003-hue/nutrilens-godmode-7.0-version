import { Navigate } from 'react-router-dom';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useAuth } from '@/contexts/AuthContext';

export default function RequireAdmin({
  children,
  requireSuper = false,
  requireOwner = false,
  allowStaff = true,
}: {
  children: React.ReactNode;
  requireSuper?: boolean;
  requireOwner?: boolean;
  /** When true, marketer & support staff can also access (in addition to admins). */
  allowStaff?: boolean;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, isOwner, isStaff, isLoading } = useAdminRole();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const hasAccess = allowStaff ? isStaff : isAdmin;
  if (!hasAccess) return <Navigate to="/dashboard" replace />;
  if (requireSuper && !isSuperAdmin && !isOwner) return <Navigate to="/admin" replace />;
  if (requireOwner && !isOwner) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
