import { Navigate } from 'react-router-dom';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useAuth } from '@/contexts/AuthContext';

export default function RequireAdmin({
  children,
  requireSuper = false,
}: {
  children: React.ReactNode;
  requireSuper?: boolean;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, isLoading } = useAdminRole();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (requireSuper && !isSuperAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
