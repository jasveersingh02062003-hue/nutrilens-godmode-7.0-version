import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminRoleState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
}

/**
 * Reads roles from public.user_roles for the current user.
 * RLS allows users to read their own roles.
 */
export function useAdminRole(): AdminRoleState {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<AdminRoleState>({
    isAdmin: false,
    isSuperAdmin: false,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setState({ isAdmin: false, isSuperAdmin: false, isLoading: false });
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (cancelled) return;
      if (error) {
        console.error('[useAdminRole]', error.message);
        setState({ isAdmin: false, isSuperAdmin: false, isLoading: false });
        return;
      }
      const roles = (data ?? []).map(r => r.role);
      setState({
        isAdmin: roles.includes('admin') || roles.includes('super_admin'),
        isSuperAdmin: roles.includes('super_admin'),
        isLoading: false,
      });
    })();

    return () => { cancelled = true; };
  }, [user, authLoading]);

  return state;
}
