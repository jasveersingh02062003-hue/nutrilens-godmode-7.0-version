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
  gapPercent: number;
  supplementName: string;
  proteinPerServing: number;
  costPerServing: number;
  costPerGramProtein: number;
  chickenCostPerGram: number;
  message: string;
  urgency: 'low' | 'medium' | 'high';
  savingsMessage?: string;
}

export interface UpsellTrigger {
  trigger: 'problem' | 'efficiency' | 'behavior';
  headline: string;
  body: string;
}

// ── Protein Gap Engine ──

export function getProteinGap(profile: UserProfile, log?: DailyLog): number {
  const dailyLog = log || getDailyLog(getTodayKey());
  const totals = getDailyTotals(dailyLog);
  return Math.max(0, (profile.dailyProtein || 75) - totals.protein);
}

// ── Protein Miss Streak ──

export function getProteinMissStreak(profile: UserProfile, days: number = 5): number {
  const allDates = getAllLogDates() as string[];
  const recent = allDates.slice(-(days + 1), -1); // exclude today
  const target = profile.dailyProtein || 75;
  let streak = 0;

  // iterate from most recent backward
  for (let i = recent.length - 1; i >= 0; i--) {
    const log = getDailyLog(recent[i]);
    const totals = getDailyTotals(log);
    if (totals.protein < target * 0.75) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ── Time Constraint Detection ──

function isTimeConstrained(profile: UserProfile): boolean {
  const cooking = (profile as any).cookingHabits || (profile as any).cooking_habits || '';
  const job = (profile as any).jobType || (profile as any).job_type || (profile as any).occupation || '';
  
  if (['rarely', 'never', 'no_cooking'].includes(cooking.toLowerCase())) return true;
  if (['shift', 'night_shift', 'rotating'].includes(job.toLowerCase())) return true;
  return false;
}

export function shouldSuggestSupplement(
  profile: UserProfile,
  log?: DailyLog,
  hour?: number
): ProteinGapSuggestion | null {
  const prefs = profile.supplementPrefs;
  if (!prefs?.items?.length) return null;

  const proteinSupp = prefs.items.find(
    s => s.proteinPerServing && s.proteinPerServing > 0
  );
  if (!proteinSupp) return null;

  const currentHour = hour ?? new Date().getHours();
  const dailyLog = log || getDailyLog(getTodayKey());
  const gap = getProteinGap(profile, dailyLog);
  const targetProtein = profile.dailyProtein || 75;
  const gapPercent = (gap / targetProtein) * 100;

  // Already logged this supplement today?
  const alreadyTaken = dailyLog.supplements?.some(
    s => s.name.toLowerCase().includes(proteinSupp.name.toLowerCase().split(' ')[0])
  );
  if (alreadyTaken) return null;

  // Behavior history
  const missStreak = getProteinMissStreak(profile);
  
  // Time constraint
  const timeConstrained = isTimeConstrained(profile);
  const thresholdReduction = timeConstrained ? 10 : 0;

  // Determine urgency and whether to show
  let urgency: 'low' | 'medium' | 'high' = 'low';
  let shouldShow = false;

  if (missStreak >= 3) {
    // High urgency: show earlier
    urgency = 'high';
    shouldShow = gapPercent > (15 - thresholdReduction) && currentHour >= 10;
  } else if (gapPercent > (40 - thresholdReduction) && currentHour >= 11) {
    urgency = 'medium';
    shouldShow = true;
  } else if (gapPercent > (25 - thresholdReduction) && currentHour >= 14) {
    urgency = 'low';
    shouldShow = true;
  }

  if (!shouldShow) return null;

  // Cost efficiency
  const costPerGram = proteinSupp.costPerServing > 0 && proteinSupp.proteinPerServing
    ? Math.round((proteinSupp.costPerServing / proteinSupp.proteinPerServing) * 10) / 10
    : 0;
  const chickenCostPerGram = 0.8;

  // Savings message
  let savingsMessage: string | undefined;
  if (costPerGram > 0 && costPerGram < chickenCostPerGram * 0.8) {
    const savingsPct = Math.round((1 - costPerGram / chickenCostPerGram) * 100);
    savingsMessage = `${savingsPct}% cheaper than chicken per gram protein`;
  }

  // Outcome-driven messaging
  let message: string;
  if (urgency === 'high') {
    message = `You're losing progress — ${missStreak} days of low protein. A ${proteinSupp.name} scoop fixes it in 10 seconds.`;
  } else if (timeConstrained) {
    message = `No time to cook? Fix ${Math.round(gap)}g protein gap in 10 seconds with ${proteinSupp.name}.`;
  } else {
    message = `You'll miss today's muscle target by ${Math.round(gap)}g. A ${proteinSupp.name} scoop (₹${proteinSupp.costPerServing}) fixes it instantly.`;
  }

  return {
    gap: Math.round(gap),
    gapPercent: Math.round(gapPercent),
    supplementName: proteinSupp.name,
    proteinPerServing: proteinSupp.proteinPerServing!,
    costPerServing: proteinSupp.costPerServing,
    costPerGramProtein: costPerGram,
    chickenCostPerGram,
    message,
    urgency,
    savingsMessage,
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
  const wholeFood = 0.8;

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
    
    const shouldTake = prefs.items.some(item => {
      if (item.frequency === 'daily') return true;
      if (item.frequency === 'workout_days') return isGymDay;
      return false;
    });

    if (shouldTake) daysPlanned++;

    const tookSupplement = (log.supplements?.length || 0) > 0;
    if (tookSupplement) {
      daysTaken++;
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
      
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

// ── Multi-Trigger Upsell System ──

export function getUpsellTrigger(profile: UserProfile): UpsellTrigger | null {
  const prefs = profile.supplementPrefs;
  if (!prefs?.items?.length) return null;

  // Trigger 1: Problem-based — protein miss streak
  const missStreak = getProteinMissStreak(profile);
  if (missStreak >= 3) {
    return {
      trigger: 'problem',
      headline: `${missStreak} days of low protein 🚨`,
      body: `You've missed your protein target ${missStreak} days straight. Get a personalized supplement + meal fix.`,
    };
  }

  // Trigger 2: Efficiency-based — overspending on supplements
  const efficiency = getSupplementCostEfficiency(profile);
  if (efficiency && efficiency.supplementCostPerGram > efficiency.wholeFoodCostPerGram * 1.2) {
    const overspendPct = Math.round((efficiency.supplementCostPerGram / efficiency.wholeFoodCostPerGram - 1) * 100);
    return {
      trigger: 'efficiency',
      headline: `Overspending ${overspendPct}% on protein 💸`,
      body: `Your supplements cost more per gram than whole foods. Optimize your stack to save ₹${Math.round(overspendPct * 3)}/month.`,
    };
  }

  // Trigger 3: Behavior-based — consistent usage
  if (prefs.items.length >= 2) {
    const adherence = getSupplementAdherence(profile, 30);
    if (adherence.streak >= 7) {
      return {
        trigger: 'behavior',
        headline: 'Unlock Supplement Stack Guide 💊',
        body: `${adherence.streak}-day streak! Get optimal timing, stacking advice, and dosage calculator.`,
      };
    }
  }

  return null;
}

// Keep old function as wrapper for backward compat
export function shouldShowSupplementUpsell(profile: UserProfile): boolean {
  return getUpsellTrigger(profile) !== null;
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

// ── Creatine Hydration Nudge ──

export function shouldBoostWater(log?: DailyLog): { boost: boolean; extraCups: number; message: string } | null {
  const dailyLog = log || getDailyLog(getTodayKey());
  const creatineLogged = (dailyLog.supplements || []).some(
    s => s.name.toLowerCase().includes('creatine')
  );
  if (!creatineLogged) return null;
  return {
    boost: true,
    extraCups: 2,
    message: 'You took creatine today — drink 2 extra glasses of water for better absorption.',
  };
}
