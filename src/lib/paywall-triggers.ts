// Daily paywall trigger logic — anti-annoyance rules.
// Stored in localStorage as a single JSON blob.

const KEY = 'paywall_state_v1';

interface PaywallState {
  lastShown: string | null;       // YYYY-MM-DD
  nextEligibleAt: number;         // epoch ms
  dismissCount: number;
  silenced: boolean;
  appOpenedAt: number;            // epoch ms — current session
}

function read(): PaywallState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return { ...defaults(), ...JSON.parse(raw) };
  } catch {
    return defaults();
  }
}

function write(s: PaywallState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function defaults(): PaywallState {
  return {
    lastShown: null,
    nextEligibleAt: 0,
    dismissCount: 0,
    silenced: false,
    appOpenedAt: Date.now(),
  };
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Call once on app open. Records the session start. */
export function markAppOpened() {
  const s = read();
  s.appOpenedAt = Date.now();
  write(s);
}

/**
 * Should we show the daily paywall right now?
 * Rules:
 *  - never if silenced
 *  - max 1× per calendar day
 *  - at least 2 hours into session (don't interrupt)
 *  - cooldown after dismiss
 */
export function shouldShowDailyPaywall(opts: { isPremium: boolean; hasLoggedMealToday: boolean }): boolean {
  if (opts.isPremium) return false;
  const s = read();
  if (s.silenced) return false;
  if (s.lastShown === todayStr()) return false;
  if (Date.now() < s.nextEligibleAt) return false;
  const sessionAgeMs = Date.now() - s.appOpenedAt;
  if (sessionAgeMs < 2 * 60 * 60 * 1000) return false;
  if (!opts.hasLoggedMealToday) return false;
  return true;
}

export function markPaywallShown() {
  const s = read();
  s.lastShown = todayStr();
  write(s);
}

export function markPaywallDismissed(reason: 'close' | 'maybe_later' | 'silence') {
  const s = read();
  s.dismissCount += 1;
  s.lastShown = todayStr();
  if (reason === 'silence') {
    s.silenced = true;
  } else if (reason === 'maybe_later') {
    s.nextEligibleAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
  } else {
    s.nextEligibleAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  }
  write(s);
}

export function markTrialCancelledCooldown() {
  const s = read();
  s.nextEligibleAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  write(s);
}

export function resetPaywallState() {
  write(defaults());
}
