// ============================================
// NutriLens AI – Age Tier & Minor Restrictions
// ============================================
// Single source of truth for age-based access control.
// Three tiers:
//   • blocked  → under 13: cannot use the app at all
//   • minor    → 13-17: restricted experience (no health diagnostics,
//                       no aggressive plans, raised calorie floor)
//   • adult    → 18+: full access
//
// Per DPDP Act 2023, processing children's (<18) personal data —
// especially health data — requires verifiable parental consent and
// special safeguards. This module is the safeguard layer.

export type AgeTier = 'blocked' | 'minor' | 'adult';

/**
 * Compute age in completed years from a YYYY-MM-DD DOB string.
 * Returns null if the DOB is missing or invalid.
 */
export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob || typeof dob !== 'string') return null;
  const m = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  const beforeBirthday =
    today.getMonth() + 1 < mo ||
    (today.getMonth() + 1 === mo && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  if (age < 0 || age > 130) return null;
  return age;
}

/**
 * Map an age (years) to the access tier.
 * - null / unknown → 'adult' (fail-open for legacy users without DOB).
 *   Onboarding asks for DOB so this only affects pre-existing accounts.
 */
export function tierForAge(age: number | null): AgeTier {
  if (age === null) return 'adult';
  if (age < 13) return 'blocked';
  if (age < 18) return 'minor';
  return 'adult';
}

/**
 * Convenience: tier directly from a DOB string.
 */
export function tierForDob(dob: string | null | undefined): AgeTier {
  return tierForAge(ageFromDob(dob));
}

/**
 * Hard safety floor for a given tier.
 * Adults: 1200 kcal (unchanged).
 * Minors: 1600 kcal — eating-disorder safeguard. Growing bodies need more.
 * Blocked: 1600 (defensive — these accounts shouldn't reach the engine).
 */
export function calorieFloorForTier(tier: AgeTier): number {
  return tier === 'adult' ? 1200 : 1600;
}

/**
 * What is hidden / disabled for minors. Single source of truth.
 * Read this in feature components rather than hardcoding tier checks.
 */
export interface MinorRestrictions {
  /** Tier bucket. */
  tier: AgeTier;
  /** True for users in the 13-17 bracket. */
  isMinor: boolean;
  /** True for users under 13 — should be blocked at signup. */
  isBlocked: boolean;
  /** Hide PCOS Score card and detail sheets. */
  hidePCOSFeatures: boolean;
  /** Hide Blood Report uploader, card, and insights. */
  hideBloodReportFeatures: boolean;
  /** Disable deadline-driven event/transformation plans. */
  disableEventPlans: boolean;
  /** Disable aggressive specialty plans (Sugar Cut, Madhavan Reset, 21-day). */
  disableAggressivePlans: boolean;
  /** Hide explicit "weight loss" copy in favour of "healthy habits". */
  softenWeightLossCopy: boolean;
  /** Minimum calorie floor enforced by the engine. */
  calorieFloor: number;
}

export function restrictionsForTier(tier: AgeTier): MinorRestrictions {
  const isMinor = tier === 'minor';
  const isBlocked = tier === 'blocked';
  const restricted = isMinor || isBlocked;
  return {
    tier,
    isMinor,
    isBlocked,
    hidePCOSFeatures: restricted,
    hideBloodReportFeatures: restricted,
    disableEventPlans: restricted,
    disableAggressivePlans: restricted,
    softenWeightLossCopy: restricted,
    calorieFloor: calorieFloorForTier(tier),
  };
}

export function restrictionsForDob(dob: string | null | undefined): MinorRestrictions {
  return restrictionsForTier(tierForDob(dob));
}

/**
 * Module-level cached floor — read by the calorie engine without
 * needing the React profile context. Set on profile load + signup.
 */
let _activeFloor = 1200;

export function setActiveCalorieFloor(floor: number): void {
  if (floor >= 1200 && floor <= 2500) _activeFloor = floor;
}

export function getActiveCalorieFloor(): number {
  return _activeFloor;
}
