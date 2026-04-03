// ============================================
// NutriLens AI – Unified Brain System
// ============================================
// Single source of truth for user profile data.
// All modules must access user data through this context.

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { UserProfile, getProfile, saveProfile } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { restoreLogsFromCloud } from '@/lib/daily-log-sync';
import { migrateLocalDataToCloud } from '@/lib/cloud-migration';
import { clearEngineCache } from '@/lib/calorie-correction';
import { initStorageCleanup } from '@/lib/storage-cleanup';
import { profileToDbRow, dbRowToProfile } from '@/lib/profile-mapper';
import { setScopedUserId } from '@/lib/scoped-storage';
import type { PCOSCondition } from '@/lib/pcos-score';

// Extended conditions interface
export interface UserConditions {
  pcos?: PCOSCondition;
  diabetes?: { has: boolean; type?: string };
  hypertension?: { has: boolean };
  lactoseIntolerance?: { has: boolean };
  thyroid?: { has: boolean };
  [key: string]: any;
}

// Context value type
interface UserProfileContextValue {
  profile: UserProfile | null;
  isLoaded: boolean;
  loadedUserId: string | null;
  updateProfile: (partial: Partial<UserProfile>) => void;
  updateConditions: (conditions: Partial<UserConditions>) => void;
  updateBudget: (budget: any) => void;
  refreshProfile: () => void;
}

const UserProfileContext = createContext<UserProfileContextValue>({
  profile: null,
  isLoaded: false,
  loadedUserId: null,
  updateProfile: () => {},
  updateConditions: () => {},
  updateBudget: () => {},
  refreshProfile: () => {},
});

// Debounced cloud sync
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

function syncToCloud(profile: UserProfile) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const row = profileToDbRow(profile, session.user.id);
    const { error } = await supabase.from('profiles').upsert(row as any);
    if (error) {
      console.error('Profile sync failed:', error);
    }
  }, 2000);
}

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(() => getProfile());
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  // Load profile from cloud, re-run whenever auth state changes
  useEffect(() => {
    let cancelled = false;

    async function loadFromCloud(userId: string) {
      // Set scoped storage user ID on load
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

        // No cloud profile found — fall back to local
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

    // Listen to auth state changes so we re-load on login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        setProfile(null);
        setLoadedUserId(null);
        setIsLoaded(false);
        void loadFromCloud(session.user.id);
      } else {
        // Logged out — clear engine caches to prevent stale data
        clearEngineCache();
        setScopedUserId(null);
        setProfile(null);
        setLoadedUserId(null);
        setIsLoaded(true);
      }
    });

    // Initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        setLoadedUserId(null);
        setIsLoaded(false);
        void loadFromCloud(session.user.id);
      } else {
        const local = getProfile();
        setProfile(local);
        setLoadedUserId(null);
        setIsLoaded(true);
      }
    });

    // Listen for budget and profile updates to trigger cloud sync
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
