import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BrandMembership {
  brand_id: string;
  role: string;
}

interface Ctx {
  isLoading: boolean;
  memberships: BrandMembership[];
}

/**
 * Gate /brand/* routes. User must either be in `user_roles` with `brand_manager`
 * or have at least one row in `brand_members`. Admins also pass.
 */
export default function RequireBrand({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<Ctx>({ isLoading: true, memberships: [] });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: members }, { data: roles }] = await Promise.all([
        supabase.from('brand_members').select('brand_id, role').eq('user_id', user.id),
        supabase.from('user_roles').select('role').eq('user_id', user.id),
      ]);
      const isAdmin = (roles ?? []).some(
        (r: any) => r.role === 'admin' || r.role === 'super_admin' || r.role === 'brand_manager',
      );
      const memberships = (members ?? []) as BrandMembership[];
      setState({ isLoading: false, memberships: memberships.length ? memberships : (isAdmin ? [{ brand_id: '__admin__', role: 'admin' }] : []) });
    })();
  }, [user]);

  if (authLoading || state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!state.memberships.length) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
