// NutriLens Subscription Service – scoped localStorage-based freemium system

import { scopedGet, scopedSet, scopedRemove } from './scoped-storage';

export type Plan = 'free' | 'premium' | 'ultra';

const SUB_KEY = 'subscription_plan';
const CAMERA_KEY = 'camera_scans_today';
const MONICA_KEY = 'monica_messages_today';
const VOICE_KEY = 'voice_scans_today';
const BARCODE_KEY = 'barcode_scans_today';
const RESET_DATE_KEY = 'last_reset_date';
const TRIAL_START_KEY = 'trial_start_date';

const FREE_CAMERA_LIMIT = 2;
const FREE_MONICA_LIMIT = 5;
const FREE_VOICE_LIMIT = 3;
const FREE_BARCODE_LIMIT = 3;
const TRIAL_DURATION_DAYS = 3;

function resetIfNeeded() {
  const today = new Date().toDateString();
  const lastReset = scopedGet(RESET_DATE_KEY);
  if (lastReset !== today) {
    scopedSet(CAMERA_KEY, '0');
    scopedSet(MONICA_KEY, '0');
    scopedSet(VOICE_KEY, '0');
    scopedSet(BARCODE_KEY, '0');
    scopedSet(RESET_DATE_KEY, today);
  }
}

export function getPlan(): Plan {
  return (scopedGet(SUB_KEY) as Plan) || 'free';
}

export function setPlan(plan: Plan) {
  scopedSet(SUB_KEY, plan);
}

export function isPremium(): boolean {
  const plan = getPlan();
  return plan === 'premium' || plan === 'ultra';
}

// ── Trial Management ──

export function startFreeTrial(): boolean {
  if (getPlan() !== 'free') return false;
  if (hasUsedTrial()) return false;
  scopedSet(TRIAL_START_KEY, new Date().toISOString());
  setPlan('premium');
  return true;
}

export function isTrialActive(): boolean {
  const start = scopedGet(TRIAL_START_KEY);
  if (!start) return false;
  if (getPlan() !== 'premium') return false;
  const daysSince = (Date.now() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince < TRIAL_DURATION_DAYS;
}

export function hasTrialExpired(): boolean {
  const start = scopedGet(TRIAL_START_KEY);
  if (!start) return false;
  const daysSince = (Date.now() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= TRIAL_DURATION_DAYS;
}

export function hasUsedTrial(): boolean {
  return scopedGet(TRIAL_START_KEY) !== null;
}

export function checkAndExpireTrial() {
  if (hasTrialExpired() && getPlan() === 'premium') {
    setPlan('free');
  }
}

export function getTrialDaysRemaining(): number {
  const start = scopedGet(TRIAL_START_KEY);
  if (!start) return 0;
  const elapsed = (Date.now() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(TRIAL_DURATION_DAYS - elapsed));
}

// ── Camera scans ──
export function canUseCameraScan(): boolean {
  if (getPlan() !== 'free') return true;
  resetIfNeeded();
  return parseInt(scopedGet(CAMERA_KEY) || '0', 10) < FREE_CAMERA_LIMIT;
}

export function incrementCameraScan() {
  if (getPlan() !== 'free') return;
  const used = parseInt(scopedGet(CAMERA_KEY) || '0', 10);
  scopedSet(CAMERA_KEY, (used + 1).toString());
}

export function getRemainingCameraScans(): number {
  if (getPlan() !== 'free') return Infinity;
  resetIfNeeded();
  return Math.max(0, FREE_CAMERA_LIMIT - parseInt(scopedGet(CAMERA_KEY) || '0', 10));
}

// ── Monica messages ──
export function canSendMonicaMessage(): boolean {
  if (getPlan() !== 'free') return true;
  resetIfNeeded();
  return parseInt(scopedGet(MONICA_KEY) || '0', 10) < FREE_MONICA_LIMIT;
}

export function incrementMonicaMessage() {
  if (getPlan() !== 'free') return;
  const used = parseInt(scopedGet(MONICA_KEY) || '0', 10);
  scopedSet(MONICA_KEY, (used + 1).toString());
}

export function getRemainingMonicaMessages(): number {
  if (getPlan() !== 'free') return Infinity;
  resetIfNeeded();
  return Math.max(0, FREE_MONICA_LIMIT - parseInt(scopedGet(MONICA_KEY) || '0', 10));
}

// ── Voice scans ──
export function canUseVoiceScan(): boolean {
  if (getPlan() !== 'free') return true;
  resetIfNeeded();
  return parseInt(scopedGet(VOICE_KEY) || '0', 10) < FREE_VOICE_LIMIT;
}

export function incrementVoiceScan() {
  if (getPlan() !== 'free') return;
  const used = parseInt(scopedGet(VOICE_KEY) || '0', 10);
  scopedSet(VOICE_KEY, (used + 1).toString());
}

export function getRemainingVoiceScans(): number {
  if (getPlan() !== 'free') return Infinity;
  resetIfNeeded();
  return Math.max(0, FREE_VOICE_LIMIT - parseInt(scopedGet(VOICE_KEY) || '0', 10));
}

// ── Barcode scans ──
export function canUseBarcodeScan(): boolean {
  if (getPlan() !== 'free') return true;
  resetIfNeeded();
  return parseInt(scopedGet(BARCODE_KEY) || '0', 10) < FREE_BARCODE_LIMIT;
}

export function incrementBarcodeScan() {
  if (getPlan() !== 'free') return;
  const used = parseInt(scopedGet(BARCODE_KEY) || '0', 10);
  scopedSet(BARCODE_KEY, (used + 1).toString());
}

export function getRemainingBarcodeScans(): number {
  if (getPlan() !== 'free') return Infinity;
  resetIfNeeded();
  return Math.max(0, FREE_BARCODE_LIMIT - parseInt(scopedGet(BARCODE_KEY) || '0', 10));
}

// ── Developer tools ──
export function resetDailyCounters() {
  scopedSet(CAMERA_KEY, '0');
  scopedSet(MONICA_KEY, '0');
  scopedSet(VOICE_KEY, '0');
  scopedSet(BARCODE_KEY, '0');
  scopedSet(RESET_DATE_KEY, new Date().toDateString());
}
