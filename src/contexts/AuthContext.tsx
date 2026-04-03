import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { UserProfile, getProfile, saveProfile } from '@/lib/store';
import { getBudgetSettings, saveBudgetSettings } from '@/lib/expense-store';
import { getEnhancedBudgetSettings, saveEnhancedBudgetSettings } from '@/lib/budget-alerts';
import { getMealPlannerProfile, saveMealPlannerProfile } from '@/lib/meal-planner-store';

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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
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
    await supabase.auth.signOut();
    // Clear local data
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('nutrilens_')) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }, []);

  const profileToDbRow = (profile: UserProfile, userId: string) => {
    // Pack budget settings from separate localStorage keys
    const budgetSettings = getBudgetSettings();
    const enhancedBudget = getEnhancedBudgetSettings();
    const mealPlannerProfile = getMealPlannerProfile();
    const budgetPayload = {
      settings: budgetSettings,
      enhanced: enhancedBudget,
      mealPlannerProfile: mealPlannerProfile,
    };

    return {
      id: userId,
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
      join_date: profile.joinDate || null,
      budget: budgetPayload,
      conditions: {
        ...((profile as unknown as Record<string, unknown>).conditions || {}),
        allergens: profile.allergens || [],
        skinConcerns: profile.skinConcerns || undefined,
        travelFrequency: profile.travelFrequency || undefined,
        kitchenAppliances: profile.kitchenAppliances || undefined,
        workplaceFacilities: profile.workplaceFacilities || undefined,
        carriesFood: profile.carriesFood || undefined,
        livingSituation: profile.livingSituation || undefined,
      },
      coach_settings: (profile as unknown as Record<string, unknown>).coachSettings ?? null,
      learning: (profile as unknown as Record<string, unknown>).learning ?? null,
      notification_settings: (profile as unknown as Record<string, unknown>).notificationSettings ?? null,
    };
  };

  const dbRowToProfile = (row: any): UserProfile => {
    // Restore budget settings from cloud to their separate localStorage keys
    if (row.budget) {
      if (row.budget.settings) {
        saveBudgetSettings(row.budget.settings);
      }
      if (row.budget.enhanced) {
        saveEnhancedBudgetSettings(row.budget.enhanced);
      }
      if (row.budget.mealPlannerProfile) {
        saveMealPlannerProfile(row.budget.mealPlannerProfile);
      }
    }

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
      age: row.age || 25,
      goal: row.goal || 'lose',
      targetWeight: Number(row.target_weight) || 65,
      goalSpeed: Number(row.goal_speed) || 0.5,
      dietaryPrefs: row.dietary_prefs || [],
      healthConditions: row.health_conditions || [],
      womenHealth: row.women_health || [],
      menHealth: row.men_health || {},
      medications: row.medications || '',
      mealTimes: row.meal_times || { breakfast: '08:00', lunch: '13:00', dinner: '20:00', snacks: '16:00' },
      waterGoal: row.water_goal || 8,
      onboardingComplete: row.onboarding_complete || false,
      dailyCalories: row.daily_calories || 2000,
      dailyProtein: row.daily_protein || 75,
      dailyCarbs: row.daily_carbs || 250,
      dailyFat: row.daily_fat || 65,
      bmi: Number(row.bmi) || 24,
      bmr: Number(row.bmr) || 1500,
      tdee: Number(row.tdee) || 2000,
      joinDate: row.join_date || undefined,
      // Restore all lifestyle fields from conditions JSON
      skinConcerns: row.conditions?.skinConcerns || undefined,
      allergens: row.conditions?.allergens || [],
      travelFrequency: row.conditions?.travelFrequency || undefined,
      kitchenAppliances: row.conditions?.kitchenAppliances || undefined,
      workplaceFacilities: row.conditions?.workplaceFacilities || undefined,
      carriesFood: row.conditions?.carriesFood || undefined,
      livingSituation: row.conditions?.livingSituation || undefined,
    } as UserProfile;
  };

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
    const profile = dbRowToProfile(data);
    // Save to local storage as well
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
    // During HMR, context can temporarily be null — force a reload instead of crashing
    if (import.meta.hot) {
      console.warn('[Auth] Context lost during HMR, reloading...');
      window.location.reload();
      // Return a placeholder to avoid the throw while reload happens
      return { user: null, session: null, isLoading: true } as AuthContextValue;
    }
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
