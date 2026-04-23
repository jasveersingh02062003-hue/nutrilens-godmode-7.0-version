// NutriLens Subscription Service
// ---------------------------------------------------------------
// Provider-agnostic monetization core.
// • Plan + status are SERVER-OWNED (read from `subscriptions` table via
//   `get_my_active_plan()` RPC). The result is cached in memory and kept
//   fresh by a Supabase realtime subscription, so synchronous getters
//   (getPlan / isPremium / isTrialActive / ...) remain cheap and side-effect free.
// • Daily counters (camera/monika/voice/barcode) stay in localStorage as
//   UX hints. AI edge functions enforce real per-day caps server-side via
//   the `ai_usage_quota` table, so spoofing localStorage gives no real benefit.
// • Trial start + cancel go through SECURITY DEFINER RPCs.
// ---------------------------------------------------------------

import { scopedGet, scopedSet } from './scoped-storage';
import { supabase } from '@/integrations/supabase/client';

export type Plan = 'free' | 'premium' | 'ultra';
export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'trialing'
  | 'past_due'
  | 'paused';

interface ServerPlan {
  plan: Plan;
  status: SubscriptionStatus;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  has_used_trial: boolean;
}

const DEFAULT_PLAN: ServerPlan = {
  plan: 'free',
  status: 'active',
  trial_end: null,
  current_period_end: null,
  cancel_at_period_end: false,
  has_used_trial: false,
};

// In-memory cache. Until the first hydration completes, getters return the
// safe DEFAULT_PLAN ('free'). This is never less restrictive than reality.
let cache: ServerPlan = DEFAULT_PLAN;
let cacheLoadedAt = 0;
const STALE_AFTER_MS = 60_000;

let inflight: Promise<ServerPlan> | null = null;
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let currentUserId: string | null = null;

const listeners = new Set<(p: ServerPlan) => void>();

function notify() {
  listeners.forEach((fn) => {
    try { fn(cache); } catch (e) { console.error('[subscription] listener', e); }
  });
}

function applyServerRow(row: Partial<ServerPlan> | null | undefined) {
  cache = {
    plan: (row?.plan as Plan) ?? 'free',
    status: (row?.status as SubscriptionStatus) ?? 'active',
    trial_end: row?.trial_end ?? null,
    current_period_end: row?.current_period_end ?? null,
    cancel_at_period_end: row?.cancel_at_period_end ?? false,
    has_used_trial: row?.has_used_trial ?? false,
  };
  cacheLoadedAt = Date.now();
  notify();
}

async function fetchPlanFromServer(): Promise<ServerPlan> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_active_plan');
      if (error) {
        console.warn('[subscription] get_my_active_plan failed', error.message);
        return cache;
      }
      const row = Array.isArray(data) ? data[0] : data;
      applyServerRow(row);
      return cache;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Call once after auth has resolved (with the user id, or null on logout). */
export function initSubscriptionService(userId: string | null) {
  if (currentUserId === userId) return;
  currentUserId = userId;

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  if (!userId) {
    applyServerRow(null);
    return;
  }

  // Initial hydrate
  void fetchPlanFromServer();

  // Realtime: any change to this user's subscription row → refresh cache
  realtimeChannel = supabase
    .channel(`subscriptions:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${userId}` },
      () => { void fetchPlanFromServer(); },
    )
    .subscribe();
}

/** Subscribe to plan changes (returns unsubscribe fn). */
export function onPlanChange(fn: (p: ServerPlan) => void) {
  listeners.add(fn);
  fn(cache);
  return () => { listeners.delete(fn); };
}

/** Force a refresh; safe to call after any action that may have changed the plan. */
export async function refreshPlan(): Promise<Plan> {
  const next = await fetchPlanFromServer();
  return next.plan;
}

/** Best-effort sync getter. If cache is stale, kicks off a background refresh. */
export function getPlan(): Plan {
  if (Date.now() - cacheLoadedAt > STALE_AFTER_MS && currentUserId) {
    void fetchPlanFromServer();
  }
  return cache.plan;
}

export function isPremium(): boolean {
  const p = getPlan();
  return p === 'premium' || p === 'ultra';
}

// ── Trial ──────────────────────────────────────────────────────

export function isTrialActive(): boolean {
  if (cache.status !== 'trialing') return false;
  if (!cache.trial_end) return false;
  return new Date(cache.trial_end).getTime() > Date.now();
}

export function hasTrialExpired(): boolean {
  if (!cache.trial_end) return false;
  return new Date(cache.trial_end).getTime() <= Date.now();
}

export function hasUsedTrial(): boolean {
  return cache.has_used_trial;
}

export function getTrialDaysRemaining(): number {
  if (!cache.trial_end) return 0;
  const ms = new Date(cache.trial_end).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Server-side trial start. Returns true on success. */
export async function startFreeTrial(): Promise<boolean> {
  const { error } = await supabase.rpc('start_trial');
  if (error) {
    console.warn('[subscription] start_trial failed', error.message);
    return false;
  }
  await refreshPlan();
  return true;
}

/** Server-side cancel. Keeps access until current_period_end. */
export async function cancelSubscription(): Promise<boolean> {
  const { error } = await supabase.functions.invoke('cancel-subscription', { body: {} });
  if (error) {
    console.warn('[subscription] cancel failed', error.message);
    return false;
  }
  await refreshPlan();
  return true;
}

/** Optional metadata captured during a mock charge so receipts and the
 *  Manage sheet can show the actual method/amount the user paid with. */
export interface MockSubscribeMeta {
  payment_method_type?: 'upi' | 'card' | 'netbanking' | 'wallet';
  payment_method_display?: string;
  amount_paise?: number;
}

/** Dev-only: flip plan via mock-subscribe edge fn (only works when DEV_MOCK_PAYMENTS=true). */
export async function mockSubscribe(
  plan: 'premium' | 'ultra',
  durationDays = 30,
  meta?: MockSubscribeMeta,
): Promise<boolean> {
  const { error } = await supabase.functions.invoke('mock-subscribe', {
    body: {
      plan,
      duration_days: durationDays,
      ...(meta?.payment_method_type ? { payment_method_type: meta.payment_method_type } : {}),
      ...(meta?.payment_method_display ? { payment_method_display: meta.payment_method_display } : {}),
      ...(typeof meta?.amount_paise === 'number' ? { amount_paise: meta.amount_paise } : {}),
    },
  });
  if (error) {
    console.warn('[subscription] mock subscribe failed', error.message);
    return false;
  }
  await refreshPlan();
  return true;
}

/** No-op kept for backwards compatibility — the server expires subscriptions. */
export function checkAndExpireTrial() {
  // Server-side `expire-subscriptions` cron handles this. We just refresh on call.
  if (currentUserId) void fetchPlanFromServer();
}

/** Legacy: caller-side plan flip is no longer allowed. Kept as no-op so old call
 *  sites don't break; logs a warning so we can find and remove them. */
export function setPlan(_plan: Plan) {
  console.warn('[subscription] setPlan() is a no-op — plan is server-owned. Use mockSubscribe() in dev.');
}

// ── Daily counters (UX hints; AI edge fns enforce real caps) ────

const CAMERA_KEY = 'camera_scans_today';
const MONICA_KEY = 'monica_messages_today';
const VOICE_KEY = 'voice_scans_today';
const BARCODE_KEY = 'barcode_scans_today';
const RESET_DATE_KEY = 'last_reset_date';

const FREE_CAMERA_LIMIT = 2;
const FREE_MONICA_LIMIT = 5;
const FREE_VOICE_LIMIT = 3;
const FREE_BARCODE_LIMIT = 3;

function resetIfNeeded() {
  const today = new Date().toDateString();
  if (scopedGet(RESET_DATE_KEY) !== today) {
    scopedSet(CAMERA_KEY, '0');
    scopedSet(MONICA_KEY, '0');
    scopedSet(VOICE_KEY, '0');
    scopedSet(BARCODE_KEY, '0');
    scopedSet(RESET_DATE_KEY, today);
  }
}

// Camera
export function canUseCameraScan(): boolean {
  if (isPremium()) return true;
  resetIfNeeded();
  return parseInt(scopedGet(CAMERA_KEY) || '0', 10) < FREE_CAMERA_LIMIT;
}
export function incrementCameraScan() {
  if (isPremium()) return;
  scopedSet(CAMERA_KEY, (parseInt(scopedGet(CAMERA_KEY) || '0', 10) + 1).toString());
}
export function getRemainingCameraScans(): number {
  if (isPremium()) return Infinity;
  resetIfNeeded();
  return Math.max(0, FREE_CAMERA_LIMIT - parseInt(scopedGet(CAMERA_KEY) || '0', 10));
}

// Monica
export function canSendMonicaMessage(): boolean {
  if (isPremium()) return true;
  resetIfNeeded();
  return parseInt(scopedGet(MONICA_KEY) || '0', 10) < FREE_MONICA_LIMIT;
}
export function incrementMonicaMessage() {
  if (isPremium()) return;
  scopedSet(MONICA_KEY, (parseInt(scopedGet(MONICA_KEY) || '0', 10) + 1).toString());
}
export function getRemainingMonicaMessages(): number {
  if (isPremium()) return Infinity;
  resetIfNeeded();
  return Math.max(0, FREE_MONICA_LIMIT - parseInt(scopedGet(MONICA_KEY) || '0', 10));
}

// Voice
export function canUseVoiceScan(): boolean {
  if (isPremium()) return true;
  resetIfNeeded();
  return parseInt(scopedGet(VOICE_KEY) || '0', 10) < FREE_VOICE_LIMIT;
}
export function incrementVoiceScan() {
  if (isPremium()) return;
  scopedSet(VOICE_KEY, (parseInt(scopedGet(VOICE_KEY) || '0', 10) + 1).toString());
}
export function getRemainingVoiceScans(): number {
  if (isPremium()) return Infinity;
  resetIfNeeded();
  return Math.max(0, FREE_VOICE_LIMIT - parseInt(scopedGet(VOICE_KEY) || '0', 10));
}

// Barcode
export function canUseBarcodeScan(): boolean {
  if (isPremium()) return true;
  resetIfNeeded();
  return parseInt(scopedGet(BARCODE_KEY) || '0', 10) < FREE_BARCODE_LIMIT;
}
export function incrementBarcodeScan() {
  if (isPremium()) return;
  scopedSet(BARCODE_KEY, (parseInt(scopedGet(BARCODE_KEY) || '0', 10) + 1).toString());
}
export function getRemainingBarcodeScans(): number {
  if (isPremium()) return Infinity;
  resetIfNeeded();
  return Math.max(0, FREE_BARCODE_LIMIT - parseInt(scopedGet(BARCODE_KEY) || '0', 10));
}

// Dev tools
export function resetDailyCounters() {
  scopedSet(CAMERA_KEY, '0');
  scopedSet(MONICA_KEY, '0');
  scopedSet(VOICE_KEY, '0');
  scopedSet(BARCODE_KEY, '0');
  scopedSet(RESET_DATE_KEY, new Date().toDateString());
}
