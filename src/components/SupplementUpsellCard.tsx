import { useState } from 'react';
import { X, Crown, AlertTriangle, PiggyBank } from 'lucide-react';
import { getProfile } from '@/lib/store';
import { getUpsellTrigger, type UpsellTrigger } from '@/lib/supplement-service';
import { useNavigate } from 'react-router-dom';
import { isDailyHidden, setDailyHidden } from '@/lib/daily-visibility';

export default function SupplementUpsellCard() {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const profile = getProfile();

  if (!profile || dismissed || isDailyHidden('supplement_upsell')) return null;

  const trigger = getUpsellTrigger(profile);
  if (!trigger) return null;

  const Icon = trigger.trigger === 'problem' ? AlertTriangle
    : trigger.trigger === 'efficiency' ? PiggyBank
    : Crown;

  const iconBg = trigger.trigger === 'problem' ? 'bg-destructive/10'
    : trigger.trigger === 'efficiency' ? 'bg-orange-500/10'
    : 'bg-accent/10';

  const iconColor = trigger.trigger === 'problem' ? 'text-destructive'
    : trigger.trigger === 'efficiency' ? 'text-orange-500'
    : 'text-accent';

  const borderColor = trigger.trigger === 'problem' ? 'border-destructive/20'
    : trigger.trigger === 'efficiency' ? 'border-orange-500/20'
    : 'border-accent/20';

  return (
    <div className={`card-elevated p-4 border ${borderColor} bg-accent/5`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {trigger.headline}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {trigger.body}
          </p>
          <button
            onClick={() => navigate('/planner?tab=plans')}
            className="mt-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold active:scale-95 transition-transform"
          >
            {trigger.trigger === 'efficiency' ? 'Optimize Stack →' : 'View Plan — ₹99/mo'}
          </button>
        </div>
        <button onClick={() => { setDismissed(true); setDailyHidden('supplement_upsell'); }} className="shrink-0">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
