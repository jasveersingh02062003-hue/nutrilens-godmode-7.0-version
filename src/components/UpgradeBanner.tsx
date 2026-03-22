import { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { getPlan, isTrialActive, getTrialDaysRemaining } from '@/lib/subscription-service';
import PlansPage from './PlansPage';

export default function UpgradeBanner() {
  const plan = getPlan();
  const [showPlans, setShowPlans] = useState(false);

  if (plan !== 'free') return null;

  const trialActive = isTrialActive();
  const trialDays = getTrialDaysRemaining();

  return (
    <>
      <button
        onClick={() => setShowPlans(true)}
        className="w-full rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/8 to-primary/3 p-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-bold text-foreground">
            {trialActive
              ? `Pro trial – ${trialDays} day${trialDays !== 1 ? 's' : ''} left`
              : 'Unlock unlimited AI scans & plans'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {trialActive
              ? 'Upgrade now to keep all features'
              : 'Personalised plans from ₹125/mo'}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
      </button>
      <PlansPage open={showPlans} onClose={() => setShowPlans(false)} onPlanChanged={() => setShowPlans(false)} />
    </>
  );
}
