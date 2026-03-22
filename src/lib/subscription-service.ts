// NutriLens Subscription Service – localStorage-based freemium system

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
  const lastReset = localStorage.getItem(RESET_DATE_KEY);
  if (lastReset !== today) {
    localStorage.setItem(CAMERA_KEY, '0');
    localStorage.setItem(MONICA_KEY, '0');
    localStorage.setItem(VOICE_KEY, '0');
    localStorage.setItem(BARCODE_KEY, '0');
    localStorage.setItem(RESET_DATE_KEY, today);
  }
}

export function getPlan(): Plan {
  return (localStorage.getItem(SUB_KEY) as Plan) || 'free';
}

export function setPlan(plan: Plan) {
  localStorage.setItem(SUB_KEY, plan);
}

export function isPremium(): boolean {
  const plan = getPlan();
  return plan === 'premium' || plan === 'ultra';
}

// ── Trial Management ──

export function startFreeTrial(): boolean {
  if (getPlan() !== 'free') return false;
  if (hasUsedTrial()) return false;
  localStorage.setItem(TRIAL_START_KEY, new Date().toISOString());
  setPlan('premium');
  return true;
}

export function isTrialActive(): boolean {
  const start = localStorage.getItem(TRIAL_START_KEY);
  if (!start) return false;
  if (getPlan() !== 'premium') return false;
  const daysSince = (Date.now() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince < TRIAL_DURATION_DAYS;
}

export function hasTrialExpired(): boolean {
  const start = localStorage.getItem(TRIAL_START_KEY);
  if (!start) return false;
  const daysSince = (Date.now() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= TRIAL_DURATION_DAYS;
}

export function hasUsedTrial(): boolean {
  return localStorage.getItem(TRIAL_START_KEY) !== null;
}

export function checkAndExpireTrial() {
  if (hasTrialExpired() && getPlan() === 'premium') {
    setPlan('free');
  }
}

export function getTrialDaysRemaining(): number {
  const start = localStorage.getItem(TRIAL_START_KEY);
  if (!start) return 0;
  const elapsed = (Date.now() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(TRIAL_DURATION_DAYS - elapsed));
}

// ── Camera scans ──
export function canUseCameraScan(): boolean {
  if (getPlan() !== 'free') return true;
  resetIfNeeded();
  return parseInt(localStorage.getItem(CAMERA_KEY) || '0', 10) < FREE_CAMERA_LIMIT;
}

export function incrementCameraScan() {
  if (getPlan() !== 'free') return;
  const used = parseInt(localStorage.getItem(CAMERA_KEY) || '0', 10);
  localStorage.setItem(CAMERA_KEY, (used + 1).toString());
}

export function getRemainingCameraScans(): number {
  if (getPlan() !== 'free') return Infinity;
  resetIfNeeded();
  return Math.max(0, FREE_CAMERA_LIMIT - parseInt(localStorage.getItem(CAMERA_KEY) || '0', 10));
}

// ── Monica messages ──
export function canSendMonicaMessage(): boolean {
  if (getPlan() !== 'free') return true;
  resetIfNeeded();
  return parseInt(localStorage.getItem(MONICA_KEY) || '0', 10) < FREE_MONICA_LIMIT;
}

export function incrementMonicaMessage() {
  if (getPlan() !== 'free') return;
  const used = parseInt(localStorage.getItem(MONICA_KEY) || '0', 10);
  localStorage.setItem(MONICA_KEY, (used + 1).toString());
}

export function getRemainingMonicaMessages(): number {
  if (getPlan() !== 'free') return Infinity;
  resetIfNeeded();
  return Math.max(0, FREE_MONICA_LIMIT - parseInt(localStorage.getItem(MONICA_KEY) || '0', 10));
}

// ── Voice scans ──
export function canUseVoiceScan(): boolean {
  if (getPlan() !== 'free') return true;
  resetIfNeeded();
  return parseInt(localStorage.getItem(VOICE_KEY) || '0', 10) < FREE_VOICE_LIMIT;
}

export function incrementVoiceScan() {
  if (getPlan() !== 'free') return;
  const used = parseInt(localStorage.getItem(VOICE_KEY) || '0', 10);
  localStorage.setItem(VOICE_KEY, (used + 1).toString());
}

export function getRemainingVoiceScans(): number {
  if (getPlan() !== 'free') return Infinity;
  resetIfNeeded();
  return Math.max(0, FREE_VOICE_LIMIT - parseInt(localStorage.getItem(VOICE_KEY) || '0', 10));
}

// ── Barcode scans ──
export function canUseBarcodeScan(): boolean {
  if (getPlan() !== 'free') return true;
  resetIfNeeded();
  return parseInt(localStorage.getItem(BARCODE_KEY) || '0', 10) < FREE_BARCODE_LIMIT;
}

export function incrementBarcodeScan() {
  if (getPlan() !== 'free') return;
  const used = parseInt(localStorage.getItem(BARCODE_KEY) || '0', 10);
  localStorage.setItem(BARCODE_KEY, (used + 1).toString());
}

export function getRemainingBarcodeScans(): number {
  if (getPlan() !== 'free') return Infinity;
  resetIfNeeded();
  return Math.max(0, FREE_BARCODE_LIMIT - parseInt(localStorage.getItem(BARCODE_KEY) || '0', 10));
}

// ── Developer tools ──
export function resetDailyCounters() {
  localStorage.setItem(CAMERA_KEY, '0');
  localStorage.setItem(MONICA_KEY, '0');
  localStorage.setItem(VOICE_KEY, '0');
  localStorage.setItem(BARCODE_KEY, '0');
  localStorage.setItem(RESET_DATE_KEY, new Date().toDateString());
}
