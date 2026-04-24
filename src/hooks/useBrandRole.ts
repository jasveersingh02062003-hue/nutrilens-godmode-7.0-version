import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type BrandMembershipRole = 'owner' | 'admin' | 'manager' | 'member';

export interface BrandMembership {
  brand_id: string;
  role: BrandMembershipRole;
}

export interface BrandRoleState {
  memberships: BrandMembership[];
  /** True if user holds owner/admin on at least one brand, OR is a platform admin/super_admin. */
  isBrandOwner: boolean;
  /** True if user is a platform admin overriding brand membership. */
  isPlatformAdmin: boolean;
  isLoading: boolean;
}

const EMPTY: BrandRoleState = {
  memberships: [],
  isBrandOwner: false,
  isPlatformAdmin: false,
  isLoading: false,
};

/**
 * Reads brand_members + user_roles to determine the user's effective brand permissions.
 * Used to gate owner-only UI like /brand/billing.
 */
export function useBrandRole(): BrandRoleState {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<BrandRoleState>({ ...EMPTY, isLoading: true });

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setState({ ...EMPTY });
      return;
    }
    (async () => {
      const [{ data: members }, { data: roles }] = await Promise.all([
        supabase.from('brand_members').select('brand_id, role').eq('user_id', user.id),
        supabase.from('user_roles').select('role').eq('user_id', user.id),
      ]);
      if (cancelled) return;

      const memberships = ((members ?? []) as any[]).map((m) => ({
        brand_id: m.brand_id as string,
        role: (m.role as BrandMembershipRole) ?? 'member',
      }));
      const roleSet = new Set(((roles ?? []) as any[]).map((r) => r.role));
      const isPlatformAdmin =
        roleSet.has('owner') || roleSet.has('super_admin') || roleSet.has('admin');
      const hasOwnerSeat = memberships.some((m) => m.role === 'owner' || m.role === 'admin');

      setState({
        memberships,
        isBrandOwner: hasOwnerSeat || isPlatformAdmin,
        isPlatformAdmin,
        isLoading: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return state;
}
