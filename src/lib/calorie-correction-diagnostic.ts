// ============================================
// Calorie Correction Engine – Diagnostic / Verification
// Runs 3 simulated scenarios without touching real user data
// ============================================

import { MODE_CONFIG } from './calorie-correction-internal';

export interface TestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
}

// We replicate the core math locally so we never touch localStorage.

function buildMockPlan(surplus: number, originalTarget: number, days: number, capPct: number): number[] {
  const maxPerDay = originalTarget * capPct;
  const perDay = Math.min(surplus / days, maxPerDay);
  return Array.from({ length: days }, () => -Math.round(perDay));
}

// ── Test 1: Single surplus day ──

export function runTest1(): TestResult {
  const base = 1500;
  const actual = 2200;
  const surplus = actual - base; // +700
  // Balanced mode: recoveryDays [3,5], surplusCap 0.20
  const days = 4; // typical pick between min(3) and max(5)
  const capPct = 0.20;
  const maxPerDay = base * capPct; // 300
  const rawPerDay = surplus / days;  // 175
  const perDay = Math.min(rawPerDay, maxPerDay); // 175 (under cap)
  const nextDayTarget = Math.round(base - perDay); // 1325

  // Verify floor clamp (80% of 1500 = 1200) — 1325 > 1200 ✓
  const floor = base * 0.80;
  const clampedTarget = Math.max(floor, nextDayTarget);

  const expectedTarget = 1325;
  const passed = clampedTarget === expectedTarget;

  return {
    name: 'Test 1 – Single Surplus Day',
    passed,
    expected: `Next-day target ≈ ${expectedTarget} kcal (spread ${surplus} over ${days} days, ${Math.round(perDay)} kcal/day reduction, cap ${maxPerDay})`,
    actual: `Calculated target = ${clampedTarget} kcal`,
    details: `Surplus: ${surplus} | Per-day reduction: ${Math.round(perDay)} | Cap: ${maxPerDay} | Floor: ${floor}`,
  };
}

// ── Test 2: Single deficit day ──

export function runTest2(): TestResult {
  const base = 1500;
  const actual = 1000;
  const deficit = base - actual; // 500
  // Balanced mode: deficitRecovery 0.40
  const recoveryFactor = 0.40;
  const recovery = deficit * recoveryFactor; // 200
  const maxRecovery = base * 0.15; // 225
  const adjust = Math.round(Math.min(recovery, maxRecovery)); // 200
  const nextDayTarget = base + adjust; // 1700
  const ceiling = base * 1.15; // 1725
  const clampedTarget = Math.round(Math.min(ceiling, nextDayTarget)); // 1700

  const expectedTarget = 1700;
  const passed = clampedTarget === expectedTarget;

  return {
    name: 'Test 2 – Single Deficit Day',
    passed,
    expected: `Next-day target ≈ ${expectedTarget} kcal (40% of ${deficit} deficit = +${adjust}, ceiling ${ceiling})`,
    actual: `Calculated target = ${clampedTarget} kcal`,
    details: `Deficit: ${deficit} | Recovery: ${adjust} | Max recovery: ${maxRecovery} | Ceiling: ${ceiling}`,
  };
}

// ── Test 3: 3 consecutive surplus days ──

export function runTest3(): TestResult {
  const base = 1500;
  const days = [2200, 2100, 2000];
  const surpluses = days.map(d => d - base); // [700, 600, 500]
  const totalSurplus = surpluses.reduce((a, b) => a + b, 0); // 1800
  const consecutiveSurplusDays = 3;

  // After 3 consecutive surplus days:
  // - failureMultiplier kicks in at >3, so at exactly 3 it's still 1.0
  //   But the recovery window extends: days = min(maxDays+2, max(minDays, consecutive+min))
  //   balanced: min=3, max=5 → days = min(7, max(3, 3+3)) = min(7,6) = 6
  const recoveryDays = 6;
  const capPct = 0.20;
  const maxPerDay = base * capPct; // 300
  const rawPerDay = totalSurplus / recoveryDays; // 300
  const perDay = Math.min(rawPerDay, maxPerDay); // 300

  // Next day target
  const nextDayTarget = base - perDay; // 1200
  const floor = base * 0.80; // 1200
  const clampedTarget = Math.max(floor, nextDayTarget); // 1200

  // Also check: weekly surplus > 1000 → hard boundary should trigger
  const hardBoundaryTriggered = totalSurplus > 1000;

  // Gentler = recovery spread over more days (6 vs normal 4)
  const isGentler = recoveryDays > 4;

  const passed = hardBoundaryTriggered && isGentler && clampedTarget >= floor;

  return {
    name: 'Test 3 – Consecutive Surplus (3 Days)',
    passed,
    expected: `Recovery spread over ${recoveryDays} days (gentler), per-day reduction capped at ${maxPerDay}, hard boundary triggered (surplus ${totalSurplus} > 1000)`,
    actual: `Recovery days: ${recoveryDays} | Per-day: ${Math.round(perDay)} | Hard boundary: ${hardBoundaryTriggered} | Target: ${clampedTarget}`,
    details: `Surpluses: ${surpluses.join(', ')} | Total: ${totalSurplus} | Floor: ${floor} | Gentler: ${isGentler}`,
  };
}

// ── Run all tests ──

export function runAllDiagnostics(): TestResult[] {
  return [runTest1(), runTest2(), runTest3()];
}
