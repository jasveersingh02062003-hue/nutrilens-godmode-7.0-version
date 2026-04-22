import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type StaffRole = 'owner' | 'super_admin' | 'admin' | 'marketer' | 'support' | 'brand_manager';

export interface AdminRoleState {
  roles: StaffRole[];
  isOwner: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;        // admin OR super_admin OR owner
  isMarketer: boolean;
  isSupport: boolean;
  isBrand: boolean;
  isStaff: boolean;        // any staff role at all
  isLoading: boolean;
}

const EMPTY: AdminRoleState = {
  roles: [],
  isOwner: false,
  isSuperAdmin: false,
  isAdmin: false,
  isMarketer: false,
  isSupport: false,
  isBrand: false,
  isStaff: false,
  isLoading: false,
};

/**
 * Reads roles from public.user_roles for the current user.
 * RLS allows users to read their own roles.
 */
export function useAdminRole(): AdminRoleState {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<AdminRoleState>({ ...EMPTY, isLoading: true });

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setState({ ...EMPTY });
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
        setState({ ...EMPTY });
        return;
      }
      const roles = ((data ?? []).map(r => r.role)) as StaffRole[];
      const isOwner = roles.includes('owner');
      const isSuperAdmin = roles.includes('super_admin');
      const isAdminRole = roles.includes('admin');
      const isMarketer = roles.includes('marketer');
      const isSupport = roles.includes('support');
      const isBrand = roles.includes('brand_manager');
      const isAdmin = isOwner || isSuperAdmin || isAdminRole;
      setState({
        roles,
        isOwner,
        isSuperAdmin,
        isAdmin,
        isMarketer,
        isSupport,
        isBrand,
        isStaff: isAdmin || isMarketer || isSupport,
        isLoading: false,
      });
    })();

    return () => { cancelled = true; };
  }, [user, authLoading]);

  return state;
}
