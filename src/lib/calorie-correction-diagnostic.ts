// ============================================
// Calorie Correction Engine – Diagnostic / Verification
// Uses actual engine functions to avoid logic drift
// ============================================

import { computeAdjustmentMap, MAX_ADJUSTMENT_PER_DAY, type DailyBalanceEntry } from './calorie-correction';

export interface TestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
}

// ── Test 1: Single surplus day → adjustments spread correctly ──

export function runTest1(): TestResult {
  const baseTarget = 1500;
  const surplus = 700;
  const pastLogs: DailyBalanceEntry[] = [
    { date: '2025-01-01', target: baseTarget, actual: baseTarget + surplus, diff: surplus },
  ];

  const adjMap = computeAdjustmentMap(pastLogs, baseTarget);
  const totalAdj = Object.values(adjMap).reduce((s, v) => s + v, 0);

  // Conservation: total adjustment should offset the surplus
  const conserved = Math.abs(surplus + totalAdj) <= 1;
  // Clamp: no single day exceeds MAX_ADJUSTMENT_PER_DAY
  const allClamped = Object.values(adjMap).every(v => Math.abs(v) <= MAX_ADJUSTMENT_PER_DAY);
  const passed = conserved && allClamped;

  return {
    name: 'Test 1 – Single Surplus Day (700 kcal)',
    passed,
    expected: `Conservation (surplus ${surplus} + adj ≈ 0), all days ≤ ±${MAX_ADJUSTMENT_PER_DAY}`,
    actual: `totalAdj=${Math.round(totalAdj)}, days=${Object.keys(adjMap).length}, conserved=${conserved}, clamped=${allClamped}`,
    details: JSON.stringify(adjMap),
  };
}

// ── Test 2: Single deficit day → partial recovery ──

export function runTest2(): TestResult {
  const baseTarget = 1500;
  const deficit = -500; // ate 1000
  const pastLogs: DailyBalanceEntry[] = [
    { date: '2025-01-01', target: baseTarget, actual: baseTarget + deficit, diff: deficit },
  ];

  const adjMap = computeAdjustmentMap(pastLogs, baseTarget);
  const totalAdj = Object.values(adjMap).reduce((s, v) => s + v, 0);

  // For deficits, engine adds back a portion (positive adjustments)
  const conserved = Math.abs(deficit + totalAdj) <= 1;
  const allPositive = Object.values(adjMap).every(v => v >= 0);
  const allClamped = Object.values(adjMap).every(v => Math.abs(v) <= MAX_ADJUSTMENT_PER_DAY);
  const passed = conserved && allPositive && allClamped;

  return {
    name: 'Test 2 – Single Deficit Day (500 kcal under)',
    passed,
    expected: `Positive adjustments, conserved, all ≤ ±${MAX_ADJUSTMENT_PER_DAY}`,
    actual: `totalAdj=${Math.round(totalAdj)}, positive=${allPositive}, conserved=${conserved}, clamped=${allClamped}`,
    details: JSON.stringify(adjMap),
  };
}

// ── Test 3: 3 consecutive surplus days → large correction, still clamped ──

export function runTest3(): TestResult {
  const baseTarget = 1500;
  const days: DailyBalanceEntry[] = [
    { date: '2025-01-01', target: baseTarget, actual: 2200, diff: 700 },
    { date: '2025-01-02', target: baseTarget, actual: 2100, diff: 600 },
    { date: '2025-01-03', target: baseTarget, actual: 2000, diff: 500 },
  ];
  const totalSurplus = days.reduce((s, d) => s + d.diff, 0); // 1800

  const adjMap = computeAdjustmentMap(days, baseTarget);
  const totalAdj = Object.values(adjMap).reduce((s, v) => s + v, 0);

  const conserved = Math.abs(totalSurplus + totalAdj) <= 1;
  const allClamped = Object.values(adjMap).every(v => Math.abs(v) <= MAX_ADJUSTMENT_PER_DAY);
  const spreadDays = Object.keys(adjMap).length;
  // Large surplus should spread over multiple days
  const wellSpread = spreadDays >= 4;

  const passed = conserved && allClamped && wellSpread;

  return {
    name: 'Test 3 – Consecutive Surplus (3 Days, 1800 kcal total)',
    passed,
    expected: `Conservation, all days ≤ ±${MAX_ADJUSTMENT_PER_DAY}, spread ≥ 4 days`,
    actual: `totalAdj=${Math.round(totalAdj)}, days=${spreadDays}, conserved=${conserved}, clamped=${allClamped}`,
    details: JSON.stringify(adjMap),
  };
}

// ── Run all tests ──

export function runAllDiagnostics(): TestResult[] {
  return [runTest1(), runTest2(), runTest3()];
}
