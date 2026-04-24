// Lightweight, fire-and-forget product analytics logger.
// Writes to public.events (RLS allows users to insert their own).
// Used to power retention cohorts, activation funnels, and admin overview.
import { supabase } from '@/integrations/supabase/client';

export type EventName =
  | 'signup'
  | 'onboarding_complete'
  | 'onboarding_step_exit'   // user abandoned onboarding mid-flow
  | 'first_meal_logged'
  | 'meal_logged'
  | 'activated'              // user logged 3 meals on signup day → strong retention predictor
  | 'plan_started'
  | 'plan_completed'
  | 'subscribe_started'      // checkout opened (intent)
  | 'subscribe_failed'       // checkout closed/errored without success
  | 'subscription_started'   // confirmed paid (post-webhook / mock-success)
  | 'churn_cancel'           // user cancelled their subscription
  | 'paywall_viewed'
  | 'app_opened'
  | 'day2_return'            // user came back the day after signup — D1 retention
  | 'feature_used';

interface LogEventOptions {
  name: EventName | string;
  properties?: Record<string, unknown>;
}

/** Fire-and-forget. Never throws. Safe to call without await. */
export async function logEvent({ name, properties }: LogEventOptions): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;
    const { error } = await supabase.from('events').insert([{
      user_id: userId,
      event_name: name,
      properties: (properties ?? {}) as any,
    }]);
    if (error) {
      // Silent in prod; visible in dev.
      if (import.meta.env.DEV) console.warn('[events]', error.message);
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[events] failed', e);
  }
}
