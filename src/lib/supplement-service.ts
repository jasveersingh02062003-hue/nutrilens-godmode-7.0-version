// ─── Intelligent Supplement Service ───
// Protein Gap Engine, adherence tracking, cost efficiency, contextual suggestions

import { getDailyLog, getDailyTotals, getProfile, getAllLogDates, type UserProfile, type DailyLog } from './store';
import { getTodayKey } from './store';
import { SUPPLEMENTS_DB } from './supplements';

// ── Types ──

export interface SupplementPref {
  name: string;
  frequency: 'daily' | 'workout_days' | 'occasional';
  costPerServing: number;
  proteinPerServing?: number;
}

export interface SupplementStats {
  totalCost: number;
  adherencePercent: number;
  streak: number;
}

export interface ProteinGapSuggestion {
  gap: number;
  supplementName: string;
  proteinPerServing: number;
  costPerServing: number;
  costPerGramProtein: number;
  chickenCostPerGram: number;
  message: string;
}

// ── Protein Gap Engine ──

export function getProteinGap(profile: UserProfile, log?: DailyLog): number {
  const dailyLog = log || getDailyLog(getTodayKey());
  const totals = getDailyTotals(dailyLog);
  return Math.max(0, (profile.dailyProtein || 75) - totals.protein);
}

export function shouldSuggestSupplement(
  profile: UserProfile,
  log?: DailyLog,
  hour?: number
): ProteinGapSuggestion | null {
  const prefs = profile.supplementPrefs;
  if (!prefs?.items?.length) return null;

  // Find a protein supplement in user's prefs
  const proteinSupp = prefs.items.find(
    s => s.proteinPerServing && s.proteinPerServing > 0
  );
  if (!proteinSupp) return null;

  const currentHour = hour ?? new Date().getHours();
  const dailyLog = log || getDailyLog(getTodayKey());
  const gap = getProteinGap(profile, dailyLog);

  // Already logged this supplement today?
  const alreadyTaken = dailyLog.supplements?.some(
    s => s.name.toLowerCase().includes(proteinSupp.name.toLowerCase().split(' ')[0])
  );
  if (alreadyTaken) return null;

  // Thresholds: show earlier if gap is larger
  const shouldShow =
    (gap > 20 && currentHour >= 14) ||
    (gap > 30 && currentHour >= 11);

  if (!shouldShow) return null;

  const costPerGram = proteinSupp.costPerServing > 0 && proteinSupp.proteinPerServing
    ? Math.round((proteinSupp.costPerServing / proteinSupp.proteinPerServing) * 10) / 10
    : 0;

  // Chicken benchmark: ~₹200/kg, ~250g protein/kg → ₹0.8/g
  const chickenCostPerGram = 0.8;

  return {
    gap: Math.round(gap),
    supplementName: proteinSupp.name,
    proteinPerServing: proteinSupp.proteinPerServing!,
    costPerServing: proteinSupp.costPerServing,
    costPerGramProtein: costPerGram,
    chickenCostPerGram,
    message: `You're ${Math.round(gap)}g short on protein. A ${proteinSupp.name} scoop (₹${proteinSupp.costPerServing}) fixes it instantly.`,
  };
}

// ── Cost Efficiency ──

export function getSupplementCostEfficiency(profile: UserProfile): {
  supplementCostPerGram: number;
  wholeFoodCostPerGram: number;
  savingsPercent: number;
} | null {
  const prefs = profile.supplementPrefs;
  if (!prefs?.items?.length) return null;

  const proteinSupps = prefs.items.filter(s => s.proteinPerServing && s.proteinPerServing > 0);
  if (proteinSupps.length === 0) return null;

  const totalCost = proteinSupps.reduce((s, p) => s + p.costPerServing, 0);
  const totalProtein = proteinSupps.reduce((s, p) => s + (p.proteinPerServing || 0), 0);
  const suppCPG = totalProtein > 0 ? totalCost / totalProtein : 0;
  const wholeFood = 0.8; // ₹/g from chicken

  return {
    supplementCostPerGram: Math.round(suppCPG * 10) / 10,
    wholeFoodCostPerGram: wholeFood,
    savingsPercent: suppCPG < wholeFood ? Math.round((1 - suppCPG / wholeFood) * 100) : 0,
  };
}

// ── Adherence Tracking ──

export function getSupplementAdherence(
  profile: UserProfile,
  days: number = 7
): { adherencePercent: number; daysTaken: number; daysPlanned: number; streak: number; totalCost: number } {
  const prefs = profile.supplementPrefs;
  if (!prefs?.items?.length) return { adherencePercent: 0, daysTaken: 0, daysPlanned: 0, streak: 0, totalCost: 0 };

  const allDates = getAllLogDates() as string[];
  const recent = allDates.slice(-days);

  let daysTaken = 0;
  let daysPlanned = 0;
  let totalCost = 0;
  let currentStreak = 0;
  let maxStreak = 0;

  for (const date of recent) {
    const log = getDailyLog(date);
    const isGymDay = log.gym?.attended === true;
    
    // Count planned days based on frequency
    const shouldTake = prefs.items.some(item => {
      if (item.frequency === 'daily') return true;
      if (item.frequency === 'workout_days') return isGymDay;
      return false; // occasional doesn't count as planned
    });

    if (shouldTake) daysPlanned++;

    const tookSupplement = (log.supplements?.length || 0) > 0;
    if (tookSupplement) {
      daysTaken++;
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
      
      // Calculate cost
      for (const supp of log.supplements || []) {
        const pref = prefs.items.find(p => 
          supp.name.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
        );
        if (pref) totalCost += pref.costPerServing;
      }
    } else if (shouldTake) {
      currentStreak = 0;
    }
  }

  return {
    adherencePercent: daysPlanned > 0 ? Math.round((daysTaken / daysPlanned) * 100) : 0,
    daysTaken,
    daysPlanned,
    streak: currentStreak,
    totalCost: Math.round(totalCost),
  };
}

// ── Supplement Budget Category ──

export function getSupplementSpendingForRange(startDate: string, endDate: string): number {
  const profile = getProfile();
  const prefs = profile?.supplementPrefs;
  if (!prefs?.items?.length) return 0;

  const allDates = getAllLogDates() as string[];
  let total = 0;

  for (const date of allDates) {
    if (date < startDate || date > endDate) continue;
    const log = getDailyLog(date);
    for (const supp of log.supplements || []) {
      const pref = prefs.items.find(p =>
        supp.name.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
      );
      if (pref) total += pref.costPerServing;
    }
  }

  return Math.round(total);
}

// ── Upsell Logic ──

export function shouldShowSupplementUpsell(profile: UserProfile): boolean {
  const prefs = profile.supplementPrefs;
  if (!prefs?.items?.length || prefs.items.length < 2) return false;

  const adherence = getSupplementAdherence(profile, 30);
  return adherence.streak >= 7;
}

// ── Auto-fill protein per serving from SUPPLEMENTS_DB ──

export function getDefaultProteinForSupplement(name: string): number | undefined {
  const dbEntry = SUPPLEMENTS_DB.find(s => 
    s.name.toLowerCase() === name.toLowerCase() ||
    name.toLowerCase().includes(s.name.toLowerCase().split(' ')[0].toLowerCase())
  );
  return dbEntry?.proteinPerUnit;
}

export function getDefaultCostForSupplement(_name: string): number {
  // Default cost estimates for common Indian supplements (₹ per serving)
  const costs: Record<string, number> = {
    'whey protein': 60,
    'casein protein': 70,
    'plant protein': 65,
    'creatine': 15,
    'bcaa': 30,
    'fish oil': 8,
    'vitamin d3': 5,
    'vitamin c': 3,
    'multivitamin': 10,
    'omega-3': 8,
    'collagen': 40,
  };
  const key = _name.toLowerCase();
  for (const [k, v] of Object.entries(costs)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return 10;
}
