import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Crown, Check, Sparkles, Camera, Brain, Utensils, Dumbbell, Archive, BarChart3, Shield, ChevronDown } from 'lucide-react';
import { setPlan, type Plan } from '@/lib/subscription-service';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

type Duration = '12months' | '1month';

const features = [
  { icon: Camera, label: 'Unlimited AI Food Scans' },
  { icon: Brain, label: 'Unlimited Monica AI Coach' },
  { icon: Utensils, label: 'Personalised Meal Plans' },
  { icon: Dumbbell, label: 'Smart Exercise Adjustments' },
  { icon: Archive, label: 'Full History & Archive' },
  { icon: BarChart3, label: 'Export Data & Insights' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onUpgraded?: () => void;
}

export default function UpgradeModal({ open, onClose, onUpgraded }: Props) {
  const [selectedDuration, setSelectedDuration] = useState<Duration>('12months');
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const handleUpgrade = () => {
    setPlan('premium');
    toast.success('Upgraded to NutriLens Pro! 🎉');
    onUpgraded?.();
    onClose();
  };

  const price = selectedDuration === '12months' ? '₹125' : '₹149';

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[88vh] rounded-t-2xl p-0">
        {/* Green header */}
        <div
          className="px-5 pt-5 pb-4"
          style={{
            background: 'linear-gradient(165deg, hsl(var(--primary)) 0%, hsl(145 35% 28%) 100%)',
          }}
        >
          <SheetHeader>
            <SheetTitle className="text-primary-foreground text-base font-display font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Upgrade to Pro
            </SheetTitle>
          </SheetHeader>
          <p className="text-xs text-primary-foreground/60 mt-1">Reach your goal 2× faster with AI</p>
        </div>

        <div className="overflow-y-auto px-5 py-4 pb-36" style={{ maxHeight: 'calc(88vh - 100px)' }}>
          {/* Plan selector */}
          <div className="flex gap-3 mb-5">
            <button
              onClick={() => setSelectedDuration('12months')}
              className={`flex-1 relative rounded-2xl border-2 p-3.5 transition-all ${
                selectedDuration === '12months'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              {selectedDuration === '12months' && (
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <span className="absolute -top-2 left-2.5 px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[8px] font-bold">
                SAVE 70%
              </span>
              <p className="text-[9px] text-muted-foreground font-medium mt-1">12 MONTHS</p>
              <p className="text-lg font-bold text-foreground">₹125<span className="text-[10px] font-normal text-muted-foreground">/mo</span></p>
            </button>
            <button
              onClick={() => setSelectedDuration('1month')}
              className={`flex-1 relative rounded-2xl border-2 p-3.5 transition-all ${
                selectedDuration === '1month'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              {selectedDuration === '1month' && (
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <p className="text-[9px] text-muted-foreground font-medium mt-1">1 MONTH</p>
              <p className="text-lg font-bold text-foreground">₹149<span className="text-[10px] font-normal text-muted-foreground">/mo</span></p>
            </button>
          </div>

          {/* Features */}
          <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" /> What you get
          </h3>
          <div className="space-y-2">
            {(showAllFeatures ? features : features.slice(0, 4)).map((f) => (
              <div key={f.label} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">{f.label}</span>
              </div>
            ))}
          </div>
          {!showAllFeatures && (
            <button
              onClick={() => setShowAllFeatures(true)}
              className="w-full mt-2 py-2 text-[11px] font-semibold text-primary flex items-center justify-center gap-1"
            >
              Show all <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border px-5 py-4 pb-6 z-50">
          <button
            onClick={handleUpgrade}
            className="w-full py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-fab active:scale-[0.98] transition-transform"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(141 47% 33%) 100%)',
              color: 'hsl(var(--primary-foreground))',
            }}
          >
            <Sparkles className="w-4 h-4" />
            Get Pro for {price}/mo
          </button>
          <p className="text-center text-[9px] text-muted-foreground mt-2">
            Simulated purchase · Cancel anytime
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
