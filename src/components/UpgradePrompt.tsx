import { useState } from 'react';
import { Crown, Sparkles, Zap } from 'lucide-react';
import UpgradeModal from './UpgradeModal';
import { hasUsedTrial, startFreeTrial } from '@/lib/subscription-service';
import { toast } from 'sonner';

interface Props {
  feature: 'camera' | 'monica';
  remaining?: number;
  onUpgraded?: () => void;
}

const messages = {
  camera: {
    title: 'Daily scan limit reached',
    desc: 'Upgrade to Premium for unlimited AI food recognition.',
    icon: '📸',
  },
  monica: {
    title: 'Daily message limit reached',
    desc: 'Upgrade to Premium for unlimited Monica conversations.',
    icon: '💬',
  },
};

export default function UpgradePrompt({ feature, remaining, onUpgraded }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const msg = messages[feature];
  const trialAvailable = !hasUsedTrial();

  const handleStartTrial = () => {
    if (startFreeTrial()) {
      toast.success('Premium trial started! Enjoy 3 days free 🎉');
      onUpgraded?.();
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{msg.icon}</span>
          <h3 className="font-semibold text-sm text-foreground">{msg.title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{msg.desc}</p>
        {remaining !== undefined && remaining > 0 && (
          <p className="text-[10px] text-accent font-medium">{remaining} remaining today</p>
        )}
        <div className="flex flex-col gap-2 pt-1">
          {trialAvailable && (
            <button
              onClick={handleStartTrial}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(141 47% 33%) 100%)',
                color: 'hsl(var(--primary-foreground))',
              }}
            >
              <Zap className="w-3.5 h-3.5" /> Try Premium Free for 3 Days
            </button>
          )}
          <button
            onClick={() => setModalOpen(true)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${
              trialAvailable
                ? 'bg-muted text-muted-foreground'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            <Crown className="w-3.5 h-3.5" /> Upgrade to Premium
          </button>
        </div>
      </div>
      <UpgradeModal open={modalOpen} onClose={() => setModalOpen(false)} onUpgraded={onUpgraded} />
    </>
  );
}
