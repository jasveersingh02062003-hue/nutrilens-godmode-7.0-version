// ============================================
// NutriLens AI – Unified Brain System
// ============================================
// Single source of truth for user profile data.
// All modules must access user data through this context.

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { UserProfile, getProfile, saveProfile } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { restoreLogsFromCloud } from '@/lib/daily-log-sync';
import { migrateLocalDataToCloud } from '@/lib/cloud-migration';
import { clearEngineCache } from '@/lib/calorie-correction';
import { initStorageCleanup } from '@/lib/storage-cleanup';
import { profileToDbRow, dbRowToProfile } from '@/lib/profile-mapper';
import { setScopedUserId } from '@/lib/scoped-storage';
import type { Session } from '@supabase/supabase-js';
import type { PCOSCondition } from '@/lib/pcos-score';
...
  // Load profile from cloud after auth session restoration completes
  const hasRestoredSessionRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadFromCloud(userId: string) {
      setScopedUserId(userId);

      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (cancelled) return;

        if (error && error.code !== 'PGRST116') {
          console.error('Failed to load profile from cloud:', error);
        }

        if (data) {
          const cloudProfile = dbRowToProfile(data as unknown as Record<string, unknown>);
          saveProfile(cloudProfile);
          setProfile(cloudProfile);
          setLoadedUserId(userId);
          setIsLoaded(true);
          restoreLogsFromCloud().catch(() => {});
          migrateLocalDataToCloud().catch(() => {});
          initStorageCleanup();
          return;
        }

        const local = getProfile();
        setProfile(local);
        setLoadedUserId(userId);
        setIsLoaded(true);
      } catch (e) {
        if (cancelled) return;
        console.error('Unexpected profile load error:', e);
        setProfile(getProfile());
        setLoadedUserId(userId);
        setIsLoaded(true);
      }
    }

    const handleSession = async (session: Session | null) => {
      if (cancelled) return;

      if (session?.user) {
        setProfile(null);
        setLoadedUserId(null);
        setIsLoaded(false);
        await loadFromCloud(session.user.id);
        return;
      }

      clearEngineCache();
      setScopedUserId(null);
      setProfile(null);
      setLoadedUserId(null);
      setIsLoaded(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled || !hasRestoredSessionRef.current) return;
      void handleSession(session);
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      hasRestoredSessionRef.current = true;
      void handleSession(session);
    });

    const handleExternalSync = () => {
      const current = getProfile();
      if (current) syncToCloud(current);
    };
    window.addEventListener('nutrilens:budget-updated', handleExternalSync);
    window.addEventListener('nutrilens:profile-updated', handleExternalSync);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener('nutrilens:budget-updated', handleExternalSync);
      window.removeEventListener('nutrilens:profile-updated', handleExternalSync);
    };
  }, []);

  const updateProfile = useCallback((partial: Partial<UserProfile>) => {
    setProfile(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      saveProfile(updated);
      syncToCloud(updated);
      return updated;
    });
  }, []);

  const updateConditions = useCallback((conditions: Partial<UserConditions>) => {
    setProfile(prev => {
      if (!prev) return prev;
      const existing = ((prev as unknown as Record<string, unknown>).conditions as Record<string, unknown>) || {};
      const updated = { ...prev, conditions: { ...existing, ...conditions } };
      saveProfile(updated);
      syncToCloud(updated);
      return updated;
    });
  }, []);

  const updateBudget = useCallback((budget: any) => {
    setProfile(prev => {
      if (!prev) return prev;
      const existing = ((prev as unknown as Record<string, unknown>).budget as Record<string, unknown>) || {};
      const updated = { ...prev, budget: { ...existing, ...budget } };
      saveProfile(updated);
      syncToCloud(updated);
      return updated;
    });
  }, []);

  const refreshProfile = useCallback(() => {
    const fresh = getProfile();
    setProfile(fresh);
  }, []);

  const value = useMemo<UserProfileContextValue>(() => ({
    profile,
    isLoaded,
    loadedUserId,
    updateProfile,
    updateConditions,
    updateBudget,
    refreshProfile,
  }), [profile, isLoaded, loadedUserId, updateProfile, updateConditions, updateBudget, refreshProfile]);

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

// Hook for consuming the context
export function useUserProfile() {
  return useContext(UserProfileContext);
}

export default UserProfileContext;
