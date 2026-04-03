import { useState } from 'react';
import { X, Crown } from 'lucide-react';
import { getProfile } from '@/lib/store';
import { shouldShowSupplementUpsell } from '@/lib/supplement-service';
import { useNavigate } from 'react-router-dom';
import { isDailyHidden, setDailyHidden } from '@/lib/daily-visibility';

export default function SupplementUpsellCard() {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const profile = getProfile();

  if (!profile || dismissed || isDailyHidden('supplement_upsell')) return null;
  if (!shouldShowSupplementUpsell(profile)) return null;

  return (
    <div className="card-elevated p-4 border border-accent/20 bg-accent/5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <Crown className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Unlock Supplement Stack Guide 💊
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            You've been consistent for 7+ days! Get optimal timing, stacking advice, and dosage calculator.
          </p>
          <button
            onClick={() => navigate('/planner?tab=plans')}
            className="mt-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold active:scale-95 transition-transform"
          >
            View Plan — ₹99/mo
          </button>
        </div>
        <button onClick={() => { setDismissed(true); setDailyHidden('supplement_upsell'); }} className="shrink-0">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
