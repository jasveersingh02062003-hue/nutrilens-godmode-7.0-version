// Tiny helpers around `logEvent` for funnel events that must fire AT MOST ONCE
// per user (e.g. first_meal_logged). Uses localStorage as the dedupe layer so
// it survives reloads but resets per browser, which is acceptable for funnel
// analytics — we de-dupe server-side by counting distinct user_ids.
import { supabase } from '@/integrations/supabase/client';
import { logEvent, type EventName } from './events';

const FIRED_KEY = 'nutrilens_funnel_fired';

function getFired(): Record<string, true> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function markFired(key: string) {
  try {
    const fired = getFired();
    fired[key] = true;
    localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
  } catch { /* noop */ }
}

/** Fire a milestone event at most once per (user, name) pair. Safe & async. */
export async function fireOnce(name: EventName, properties?: Record<string, unknown>) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return; // anonymous users don't get milestone events
    const key = `${uid}:${name}`;
    const fired = getFired();
    if (fired[key]) return;
    markFired(key);
    void logEvent({ name, properties });
  } catch { /* noop */ }
}
