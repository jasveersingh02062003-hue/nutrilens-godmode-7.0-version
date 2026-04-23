import { useState } from 'react';
import { ArrowLeft, Check, Sparkles, ShieldCheck } from 'lucide-react';
import PaymentMethodSheet from './PaymentMethodSheet';

interface Props {
  onBack: () => void;
  onClose: () => void;
  onUpgraded?: () => void;
}

type Duration = '12months' | '1month';

export default function PlanPickerScreen({ onBack, onClose, onUpgraded }: Props) {
  const [duration, setDuration] = useState<Duration>('12months');
  const [showPayment, setShowPayment] = useState(false);

  const yearly = duration === '12months';
  const amountPaise = yearly ? 149900 : 14900;
  const displayPrice = yearly ? '₹1,499' : '₹149';
  const perMo = yearly ? '₹125/mo' : '₹149/mo';

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center" aria-label="Back">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Choose your plan</span>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32">
        <div className="text-center mt-4 mb-6">
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
          <h1 className="text-2xl font-display font-bold text-foreground leading-tight">
            Start your 3-day<br />free trial
          </h1>
          <p className="text-xs text-muted-foreground mt-2">No charges during trial · Cancel anytime</p>
        </div>

        {/* Plan cards */}
        <div className="space-y-3 mb-5">
          {/* Yearly */}
          <button
            onClick={() => setDuration('12months')}
            className={`w-full text-left relative rounded-2xl border-2 p-4 transition-all ${
              yearly ? 'border-primary bg-primary/5' : 'border-border bg-card'
            }`}
          >
            <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[9px] font-bold uppercase tracking-wider">
              Save 70% · Best value
            </div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Yearly</p>
                <p className="text-xl font-bold text-foreground mt-0.5">₹125<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                <p className="text-[11px] text-muted-foreground mt-0.5">₹1,499 billed yearly</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-2 ${yearly ? 'border-primary bg-primary' : 'border-border'}`}>
                {yearly && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
            </div>
          </button>

          {/* Monthly */}
          <button
            onClick={() => setDuration('1month')}
            className={`w-full text-left relative rounded-2xl border-2 p-4 transition-all ${
              !yearly ? 'border-primary bg-primary/5' : 'border-border bg-card'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Monthly</p>
                <p className="text-xl font-bold text-foreground mt-0.5">₹149<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Billed every month</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-2 ${!yearly ? 'border-primary bg-primary' : 'border-border'}`}>
                {!yearly && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
            </div>
          </button>
        </div>

        {/* Reassurance */}
        <div className="rounded-xl bg-muted/40 p-3 space-y-2">
          {[
            'Free for the first 3 days',
            'Cancel anytime in 1 tap',
            'Reminder before any charge',
          ].map((t) => (
            <div key={t} className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="text-xs text-foreground">{t}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 justify-center mt-4 text-muted-foreground">
          <ShieldCheck className="w-3 h-3" />
          <span className="text-[10px]">Encrypted · UPI / Card / NetBanking</span>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border px-5 py-4 pb-6">
        <button
          onClick={() => setShowPayment(true)}
          className="w-full py-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
            color: 'hsl(var(--primary-foreground))',
          }}
        >
          Continue · {perMo}
        </button>
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          Trial starts today · {displayPrice} after 3 days
        </p>
      </div>

      <PaymentMethodSheet
        open={showPayment}
        onClose={() => setShowPayment(false)}
        amountPaise={amountPaise}
        durationDays={yearly ? 365 : 30}
        planLabel={yearly ? 'NutriLens Pro · Yearly' : 'NutriLens Pro · Monthly'}
        priceId={yearly ? 'premium_yearly' : 'premium_monthly'}
        onSuccess={() => {
          setShowPayment(false);
          onUpgraded?.();
          onClose();
        }}
      />
    </div>
  );
}
