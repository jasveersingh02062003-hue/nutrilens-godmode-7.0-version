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
    const row: Record<string, any> = {
      id: session.user.id,
      name: profile.name,
      gender: profile.gender,
      occupation: profile.occupation,
      job_type: profile.jobType,
      work_activity: profile.workActivity,
      exercise_routine: profile.exerciseRoutine,
      sleep_hours: profile.sleepHours,
      stress_level: profile.stressLevel,
      cooking_habits: profile.cookingHabits,
      eating_out: profile.eatingOut,
      caffeine: profile.caffeine,
      alcohol: profile.alcohol,
      activity_level: profile.activityLevel,
      height_cm: profile.heightCm,
      weight_kg: profile.weightKg,
      dob: profile.dob,
      age: profile.age,
      goal: profile.goal,
      target_weight: profile.targetWeight,
      goal_speed: profile.goalSpeed,
      dietary_prefs: profile.dietaryPrefs,
      health_conditions: profile.healthConditions,
      women_health: profile.womenHealth,
      men_health: profile.menHealth,
      medications: profile.medications,
      meal_times: profile.mealTimes,
      water_goal: profile.waterGoal,
      onboarding_complete: profile.onboardingComplete,
      daily_calories: profile.dailyCalories,
      daily_protein: profile.dailyProtein,
      daily_carbs: profile.dailyCarbs,
      daily_fat: profile.dailyFat,
      bmi: profile.bmi,
      bmr: profile.bmr,
      tdee: profile.tdee,
      // Sync budget, conditions, coach, learning, and notification settings
      budget: (profile as any).budget || null,
      conditions: (profile as any).conditions || null,
      coach_settings: (profile as any).coachSettings || null,
      learning: (profile as any).learning || null,
      notification_settings: (profile as any).notificationSettings || null,
      join_date: profile.joinDate || null,
    };
    const { error } = await supabase.from('profiles').upsert(row as any);
    if (error) {
      console.error('Profile sync failed:', error);
    }
  }, 2000);
}

function dbRowToProfile(row: any): UserProfile {
  return {
    name: row.name || '',
    gender: row.gender || '',
    occupation: row.occupation || '',
    jobType: row.job_type || '',
    workActivity: row.work_activity || '',
    exerciseRoutine: row.exercise_routine || '',
    sleepHours: row.sleep_hours || '',
    stressLevel: row.stress_level || '',
    cookingHabits: row.cooking_habits || '',
    eatingOut: row.eating_out || '',
    caffeine: row.caffeine || '',
    alcohol: row.alcohol || '',
    activityLevel: row.activity_level || 'moderate',
    heightCm: Number(row.height_cm) || 170,
    weightKg: Number(row.weight_kg) || 70,
    dob: row.dob || '',
    age: Number(row.age) || 25,
    goal: row.goal || 'lose',
    targetWeight: Number(row.target_weight) || 65,
    goalSpeed: Number(row.goal_speed) || 0.5,
    dietaryPrefs: row.dietary_prefs || [],
    healthConditions: row.health_conditions || [],
    womenHealth: row.women_health || [],
    menHealth: row.men_health || {},
    medications: row.medications || '',
    mealTimes: row.meal_times || { breakfast: '08:00', lunch: '13:00', dinner: '20:00', snacks: '16:00' },
    waterGoal: Number(row.water_goal) || 8,
    onboardingComplete: Boolean(row.onboarding_complete),
    dailyCalories: Number(row.daily_calories) || 2000,
    dailyProtein: Number(row.daily_protein) || 75,
    dailyCarbs: Number(row.daily_carbs) || 250,
    dailyFat: Number(row.daily_fat) || 65,
    bmi: Number(row.bmi) || 24,
    bmr: Number(row.bmr) || 1500,
    tdee: Number(row.tdee) || 2000,
    // Restore extended fields from cloud
    skinConcerns: row.conditions?.skinConcerns || undefined,
    joinDate: row.join_date || undefined,
  } as UserProfile;
}

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(() => getProfile());
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  // Load profile from cloud, re-run whenever auth state changes
  useEffect(() => {
    let cancelled = false;

    async function loadFromCloud(userId: string) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (cancelled) return;

        if (error && error.code !== 'PGRST116') {
          console.error('Failed to load profile from cloud:', error);
        }

        if (data) {
          const cloudProfile = dbRowToProfile(data);
          saveProfile(cloudProfile);
          setProfile(cloudProfile);
          setLoadedUserId(userId);
          setIsLoaded(true);
          // Restore daily logs in the background
          // Restore daily logs and migrate localStorage data in background
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

    return () => {
      cancelled = true;
      subscription.unsubscribe();
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
      const existing = (prev as any).conditions || {};
      const updated = { ...prev, conditions: { ...existing, ...conditions } };
      saveProfile(updated);
      syncToCloud(updated);
      return updated;
    });
  }, []);

  const updateBudget = useCallback((budget: any) => {
    setProfile(prev => {
      if (!prev) return prev;
      const existing = (prev as any).budget || {};
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
