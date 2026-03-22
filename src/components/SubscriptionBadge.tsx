import { getPlan } from '@/lib/subscription-service';
import { Crown, Gem } from 'lucide-react';

export default function SubscriptionBadge() {
  const plan = getPlan();

  if (plan === 'free') {
    return (
      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
        Free
      </span>
    );
  }

  if (plan === 'premium') {
    return (
      <span className="relative text-[9px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary flex items-center gap-1 overflow-hidden">
        <span
          className="absolute inset-0 animate-shimmer"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.08) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
        />
        <Crown className="w-2.5 h-2.5 relative z-10" />
        <span className="relative z-10">Pro</span>
      </span>
    );
  }

  return (
    <span className="relative text-[9px] font-semibold px-2 py-0.5 rounded-full bg-violet/15 text-violet flex items-center gap-1 overflow-hidden">
      <span
        className="absolute inset-0 animate-shimmer"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, hsl(var(--violet) / 0.1) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
        }}
      />
      <Gem className="w-2.5 h-2.5 relative z-10" />
      <span className="relative z-10">Ultra</span>
    </span>
  );
}
