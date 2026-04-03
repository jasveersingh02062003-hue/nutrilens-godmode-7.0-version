// ==========================================
// NutriLens AI – Plateau Detection & Handling
// Detects weight stalls and adjusts targets
// ==========================================

import { getWeightEntries } from './weight-history';
import { getProfile, saveProfile, type UserProfile, getComputedAge } from './store';

const PLATEAU_KEY = 'nutrilens_plateau_adjustments';

export interface PlateauAdjustment {
  date: string;
  previousTarget: number;
  newTarget: number;
  reductionPercent: number;
}

export function detectPlateau(): { detected: boolean; daysSinceChange: number } {
  const entries = getWeightEntries();
  if (entries.length < 3) return { detected: false, daysSinceChange: 0 };

  const profile = getProfile();
  if (!profile || profile.goal !== 'lose') return { detected: false, daysSinceChange: 0 };

  // Check last entry vs entries from 10+ days ago
  const latest = entries[entries.length - 1];
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  const tenDaysAgoStr = `${tenDaysAgo.getFullYear()}-${String(tenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(tenDaysAgo.getDate()).padStart(2, '0')}`;

  const olderEntries = entries.filter(e => e.date <= tenDaysAgoStr);
  if (olderEntries.length === 0) return { detected: false, daysSinceChange: 0 };

  const referenceEntry = olderEntries[olderEntries.length - 1];
  // Normalize weights to kg for comparison
  const latestKg = latest.unit === 'lbs' ? latest.weight * 0.453592 : latest.weight;
  const refKg = referenceEntry.unit === 'lbs' ? referenceEntry.weight * 0.453592 : referenceEntry.weight;
  const weightChange = Math.abs(latestKg - refKg);

  // Calculate days between
  const daysBetween = Math.round(
    (new Date(latest.date).getTime() - new Date(referenceEntry.date).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Plateau = less than 0.2kg change over 10+ days
  if (weightChange < 0.2 && daysBetween >= 10) {
    return { detected: true, daysSinceChange: daysBetween };
  }

  return { detected: false, daysSinceChange: daysBetween };
}

export function applyPlateauAdjustment(): PlateauAdjustment | null {
  const profile = getProfile();
  if (!profile) return null;

  // Check if already adjusted recently
  let adjustments: PlateauAdjustment[] = [];
  try { adjustments = JSON.parse(scopedGet(PLATEAU_KEY) || '[]'); } catch {}
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const recentAdjustment = adjustments.find(a => {
    const daysSince = Math.round(
      (new Date(today).getTime() - new Date(a.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince < 14; // Don't adjust more than once per 2 weeks
  });
  if (recentAdjustment) return null;

  // Calculate total reduction so far
  const totalReduction = adjustments.reduce((sum, a) => sum + a.reductionPercent, 0);
  if (totalReduction >= 20) return null; // Cap at 20% total reduction

  // Apply 5-8% reduction (scale with number of plateaus)
  const reductionPercent = Math.min(8, 5 + adjustments.length);
  const previousTarget = profile.dailyCalories;
  const newTarget = Math.round(previousTarget * (1 - reductionPercent / 100));

  // Save adjustment record
  const adjustment: PlateauAdjustment = {
    date: today,
    previousTarget,
    newTarget,
    reductionPercent,
  };
  adjustments.push(adjustment);
  scopedSet(PLATEAU_KEY, JSON.stringify(adjustments));

  // Update profile — protein stays locked, preserve original target
  const updatedProfile = { ...profile, dailyCalories: newTarget };
  if (!profile.originalDailyCalories) {
    updatedProfile.originalDailyCalories = previousTarget;
  }
  // Redistribute carbs/fat only (protein locked)
  const proteinCals = profile.dailyProtein * 4;
  const remainingOld = previousTarget - proteinCals;
  const remainingNew = newTarget - proteinCals;
  if (remainingOld > 0) {
    const ratio = remainingNew / remainingOld;
    updatedProfile.dailyCarbs = Math.round(profile.dailyCarbs * ratio);
    updatedProfile.dailyFat = Math.round(profile.dailyFat * ratio);
  }
  saveProfile(updatedProfile);

  return adjustment;
}
