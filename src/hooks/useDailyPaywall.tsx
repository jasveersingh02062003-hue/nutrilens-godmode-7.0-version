import { useEffect, useState } from 'react';
import { onPlanChange } from '@/lib/subscription-service';
import { shouldShowDailyPaywall, markPaywallShown, markPaywallDismissed, markAppOpened } from '@/lib/paywall-triggers';
import { getDailyLog } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import PaywallScreen from '@/components/paywall/PaywallScreen';

/**
 * Mounts a single daily paywall trigger. Fires at most once per calendar day,
 * only after the user has been engaged (≥1 meal logged + 2h since app open).
 * Skips entirely on logged-out sessions.
 */
export function DailyPaywallProvider() {
  const [open, setOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    markAppOpened();
    const off = onPlanChange((p) => setIsPremium(p.plan !== 'free'));

    // Track auth state so we don't poll on logged-out sessions
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      off();
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isPremium) return;
    if (!userId) return; // skip polling when logged out

    // Check every 5 minutes — cheap, all in-memory
    const tick = () => {
      try {
        const log = getDailyLog();
        const mealsLogged = (log?.meals ?? []).length > 0;
        if (shouldShowDailyPaywall({ isPremium, hasLoggedMealToday: mealsLogged })) {
          markPaywallShown();
          setOpen(true);
        }
      } catch { /* noop */ }
    };
    const t = setInterval(tick, 5 * 60 * 1000);
    // First check after 2h gate would never fire on first session anyway, so
    // do a delayed initial check after 30s for sessions that span midnight.
    const initial = setTimeout(tick, 30_000);
    return () => { clearInterval(t); clearTimeout(initial); };
  }, [isPremium, userId]);

  return (
    <PaywallScreen
      open={open}
      onClose={() => { markPaywallDismissed('close'); setOpen(false); }}
      onUpgraded={() => setOpen(false)}
    />
  );
}
