import { useEffect, useState } from 'react';
import { onPlanChange } from '@/lib/subscription-service';
import { shouldShowDailyPaywall, markPaywallShown, markPaywallDismissed, markAppOpened } from '@/lib/paywall-triggers';
import { getDailyLog } from '@/lib/store';
import PaywallScreen from '@/components/paywall/PaywallScreen';

/**
 * Mounts a single daily paywall trigger. Fires at most once per calendar day,
 * only after the user has been engaged (≥1 meal logged + 2h since app open).
 */
export function DailyPaywallProvider() {
  const [open, setOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    markAppOpened();
    const off = onPlanChange((p) => setIsPremium(p.plan !== 'free'));
    return off;
  }, []);

  useEffect(() => {
    if (isPremium) return;
    // Check every 5 minutes — cheap, all in-memory
    const tick = () => {
      try {
        const log = getTodaysLog();
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
  }, [isPremium]);

  return (
    <PaywallScreen
      open={open}
      onClose={() => { markPaywallDismissed('close'); setOpen(false); }}
      onUpgraded={() => setOpen(false)}
    />
  );
}
