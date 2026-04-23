import { useEffect, useMemo } from 'react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import {
  ageFromDob,
  restrictionsForDob,
  setActiveCalorieFloor,
  type MinorRestrictions,
} from '@/lib/age-tier';

/**
 * Reactive hook that returns the current user's age tier + restrictions.
 * Also publishes the active calorie floor to the engine module so the
 * calorie correction code (which is non-React) picks up the safer floor
 * for minors automatically.
 */
export function useAgeTier(): MinorRestrictions & { age: number | null } {
  const { profile } = useUserProfile();
  const dob = profile?.dob ?? null;

  const restrictions = useMemo(() => restrictionsForDob(dob), [dob]);

  useEffect(() => {
    setActiveCalorieFloor(restrictions.calorieFloor);
  }, [restrictions.calorieFloor]);

  return { ...restrictions, age: ageFromDob(dob) };
}
