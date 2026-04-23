import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { UserProfile, saveProfile } from '@/lib/store';
import { profileToDbRow, dbRowToProfile } from '@/lib/profile-mapper';
import { setScopedUserId, clearScopedData } from '@/lib/scoped-storage';
import { setSentryUser } from '@/lib/sentry';
import { initSubscriptionService } from '@/lib/subscription-service';
import { logEvent } from '@/lib/events';

// Module-scoped guard so `signup` only fires the very first time we see this user
// in this browser session (created_at within the last few minutes).
const SEEN_USERS_KEY = 'nutrilens_seen_user_ids';
function hasSeenUser(id: string): boolean {
  try {
    const raw = localStorage.getItem(SEEN_USERS_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return ids.includes(id);
  } catch { return false; }
}
function markUserSeen(id: string) {
  try {
    const raw = localStorage.getItem(SEEN_USERS_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(SEEN_USERS_KEY, JSON.stringify(ids.slice(-50)));
    }
  } catch { /* noop */ }
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOTP: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  syncProfileToCloud: (profile: UserProfile) => Promise<void>;
  loadProfileFromCloud: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasRestoredSessionRef = useRef(false);

  useEffect(() => {
    const applySession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setScopedUserId(nextSession?.user?.id ?? null);
      setSentryUser(nextSession?.user?.id ?? null);
      initSubscriptionService(nextSession?.user?.id ?? null);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      applySession(nextSession);
      // Funnel: SIGNED_IN fires both for fresh signups and restored sessions.
      // Treat first-ever sighting of a user_id in this browser as the signup;
      // every subsequent sign-in counts as an app_opened.
      const uid = nextSession?.user?.id;
      if (uid && event === 'SIGNED_IN') {
        if (!hasSeenUser(uid)) {
          markUserSeen(uid);
          void logEvent({ name: 'signup', properties: { method: nextSession?.user?.app_metadata?.provider ?? 'email' } });
        }
        void logEvent({ name: 'app_opened' });
      }
      if (hasRestoredSessionRef.current) {
        setIsLoading(false);
      }
    });

    void supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      hasRestoredSessionRef.current = true;
      applySession(nextSession);
      const uid = nextSession?.user?.id;
      if (uid) {
        if (!hasSeenUser(uid)) markUserSeen(uid);
        void logEvent({ name: 'app_opened' });
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name || '' } },
    });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signInWithPhone = useCallback(async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const verifyOTP = useCallback(async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { lovable } = await import('@/integrations/lovable/index');
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        return { error: result.error instanceof Error ? result.error : new Error(String(result.error)) };
      }
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error(String(e)) };
    }
  }, []);

  const logout = useCallback(async () => {
    const userId = user?.id;
    await supabase.auth.signOut();
    setScopedUserId(null);
    if (userId) {
      clearScopedData(userId);
    }
    // Also clear legacy un-scoped keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('nutrilens_') && key !== 'nutrilens_splash_shown') keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }, [user]);

  const syncProfileToCloud = useCallback(async (profile: UserProfile) => {
    if (!user) throw new Error('Not authenticated');
    const row = profileToDbRow(profile, user.id);
    const { error } = await supabase.from('profiles').upsert(row as any);
    if (error) throw new Error(error.message);
  }, [user]);

  const loadProfileFromCloud = useCallback(async (): Promise<UserProfile | null> => {
    if (!user) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error || !data) return null;
    const profile = dbRowToProfile(data as unknown as Record<string, unknown>);
    saveProfile(profile);
    return profile;
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, session, isLoading,
      signUpWithEmail, signInWithEmail, signInWithPhone, verifyOTP,
      signInWithGoogle, logout, syncProfileToCloud, loadProfileFromCloud,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    if (import.meta.hot) {
      console.warn('[Auth] Context lost during HMR, reloading...');
      window.location.reload();
      return { user: null, session: null, isLoading: true } as AuthContextValue;
    }
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
