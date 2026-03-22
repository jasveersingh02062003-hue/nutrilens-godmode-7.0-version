import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Check, ChevronDown, ChevronUp, MessageCircle, ArrowRight, Star, Zap } from 'lucide-react';
import { getPlan, setPlan, isTrialActive, hasUsedTrial, startFreeTrial, getTrialDaysRemaining, hasTrialExpired, checkAndExpireTrial, type Plan } from '@/lib/subscription-service';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onPlanChanged: () => void;
}

type Duration = '12months' | '1month';

const planData = [
  {
    id: 'free' as Plan,
    name: 'Free',
    tagline: 'Get started',
    monthlyPrice: { '12months': '₹0', '1month': '₹0' },
    totalPrice: { '12months': 'Free forever', '1month': 'Free forever' },
    icon: '🆓',
    gradient: 'from-muted to-muted/60',
    borderClass: 'border-border',
    features: [
      '2 camera scans/day',
      '5 Monica messages/day',
      'Basic meal plan',
      '7-day history',
    ],
  },
  {
    id: 'premium' as Plan,
    name: 'Pro',
    tagline: 'Most popular',
    monthlyPrice: { '12months': '₹125', '1month': '₹149' },
    totalPrice: { '12months': '₹1,499/year', '1month': '₹149/month' },
    icon: '⭐',
    gradient: 'from-primary/15 to-primary/5',
    borderClass: 'border-primary',
    badge: 'BEST VALUE',
    features: [
      'Unlimited AI scans',
      'Unlimited Monica AI',
      'Personalised meal plans',
      'Exercise auto-adjustments',
      'Full history & archive',
      'Export data & share health card',
    ],
  },
  {
    id: 'ultra' as Plan,
    name: 'Ultra',
    tagline: 'For serious achievers',
    monthlyPrice: { '12months': '₹833', '1month': '₹999' },
    totalPrice: { '12months': '₹9,999/year', '1month': '₹999/month' },
    icon: '💎',
    gradient: 'from-violet/15 to-violet/5',
    borderClass: 'border-violet',
    features: [
      'Everything in Pro',
      '1 coaching session/month',
      'Priority support',
    ],
  },
];

const testimonials = [
  { name: 'Priya Sharma', initials: 'PS', loss: '12 kg in 4 months', quote: 'NutriLens made tracking so easy! The AI scans saved me hours every week. I finally reached my goal weight.', rating: 5, color: 'bg-primary/20 text-primary' },
  { name: 'Arjun Mehta', initials: 'AM', loss: '8 kg in 3 months', quote: 'Monica AI coach is like having a nutritionist in my pocket. The personalised meal plans were a game-changer.', rating: 5, color: 'bg-accent/20 text-accent-foreground' },
  { name: 'Sneha Reddy', initials: 'SR', loss: '15 kg in 6 months', quote: 'The exercise auto-adjustments kept me on track even on my busiest days. Worth every rupee!', rating: 5, color: 'bg-destructive/20 text-destructive' },
  { name: 'Rahul Verma', initials: 'RV', loss: '10 kg in 5 months', quote: 'I tried many apps but NutriLens understands Indian food like no other. The budget tracking is brilliant.', rating: 5, color: 'bg-primary/20 text-primary' },
  { name: 'Kavita Nair', initials: 'KN', loss: '7 kg in 2 months', quote: 'Started with the free trial and upgraded within a day. The skin health tips were an unexpected bonus!', rating: 5, color: 'bg-accent/20 text-accent-foreground' },
];

export default function PlansPage({ open, onClose, onPlanChanged }: Props) {
  const currentPlan = getPlan();
  const [duration, setDuration] = useState<Duration>('12months');
  const [expandedPlan, setExpandedPlan] = useState<Plan | null>('premium');
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const trialActive = isTrialActive();
  const trialUsed = hasUsedTrial();
  const trialExpired = hasTrialExpired();
  const trialDays = getTrialDaysRemaining();

  // Check and expire trial on open
  useEffect(() => {
    if (open) checkAndExpireTrial();
  }, [open]);

  // Auto-rotate testimonials
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [open]);

  const handleSelectPlan = (planId: Plan) => {
    if (planId === currentPlan) return;
    if (planId === 'free') {
      setPlan('free');
      toast.success('Switched to Free plan');
    } else {
      setPlan(planId);
      toast.success(`Upgraded to ${planId === 'premium' ? 'Pro' : 'Ultra'}! 🎉`);
    }
    onPlanChanged();
    onClose();
  };

  const handleStartTrial = () => {
    if (startFreeTrial()) {
      toast.success('Premium trial started! Enjoy 3 days of Pro features 🎉');
      onPlanChanged();
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl p-0">
        {/* Header */}
        <div
          className="px-5 pt-6 pb-5"
          style={{
            background: 'linear-gradient(165deg, hsl(var(--primary)) 0%, hsl(145 35% 28%) 100%)',
          }}
        >
          <SheetHeader>
            <SheetTitle className="text-primary-foreground text-lg font-display font-bold flex items-center gap-2">
              <Crown className="w-5 h-5" /> Choose Your Plan
            </SheetTitle>
          </SheetHeader>
          <p className="text-xs text-primary-foreground/60 mt-1">Unlock the full NutriLens experience</p>

          {/* Trial Status Banner */}
          {trialActive && (
            <div className="mt-3 rounded-xl bg-primary-foreground/15 px-3 py-2 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" />
              <span className="text-[11px] font-semibold text-primary-foreground">
                Premium Trial Active – {trialDays} day{trialDays !== 1 ? 's' : ''} remaining
              </span>
            </div>
          )}
          {trialExpired && currentPlan === 'free' && (
            <div className="mt-3 rounded-xl bg-primary-foreground/10 px-3 py-2">
              <span className="text-[11px] font-medium text-primary-foreground/80">
                Your free trial has expired. Upgrade to continue.
              </span>
            </div>
          )}

          {/* Duration Toggle */}
          <div className="flex mt-4 bg-primary-foreground/10 rounded-full p-1">
            <button
              onClick={() => setDuration('12months')}
              className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all ${
                duration === '12months'
                  ? 'bg-primary-foreground text-primary'
                  : 'text-primary-foreground/70'
              }`}
            >
              12 Months <span className="text-[9px] opacity-70">(Save 70%)</span>
            </button>
            <button
              onClick={() => setDuration('1month')}
              className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all ${
                duration === '1month'
                  ? 'bg-primary-foreground text-primary'
                  : 'text-primary-foreground/70'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Plans List */}
        <div className="overflow-y-auto px-5 py-4 space-y-3 pb-32" style={{ maxHeight: 'calc(92vh - 220px)' }}>
          {planData.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isExpanded = expandedPlan === plan.id;

            return (
              <motion.div
                key={plan.id}
                layout
                className={`rounded-2xl border-2 overflow-hidden transition-all ${
                  isCurrent ? plan.borderClass : 'border-border'
                } bg-gradient-to-br ${plan.gradient}`}
              >
                {/* Plan Header */}
                <button
                  onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <span className="text-2xl">{plan.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{plan.name}</span>
                      {plan.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[8px] font-bold">
                          {plan.badge}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{plan.tagline}</p>
                  </div>
                  <div className="text-right mr-1">
                    <p className="text-lg font-bold text-foreground">{plan.monthlyPrice[duration]}</p>
                    <p className="text-[9px] text-muted-foreground">/month</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {/* Expanded Features */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4"
                  >
                    <div className="border-t border-border/50 pt-3 space-y-2">
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="text-xs text-foreground">{f}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3">{plan.totalPrice[duration]}</p>

                    {/* CTA Button - with trial logic for Premium */}
                    {plan.id === 'premium' && !isCurrent && !trialUsed && currentPlan === 'free' ? (
                      <button
                        onClick={handleStartTrial}
                        className="w-full mt-3 py-3 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-fab active:scale-[0.98] transition-all"
                      >
                        ✨ Start 3-Day Free Trial
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={isCurrent}
                        className={`w-full mt-3 py-3 rounded-xl text-sm font-bold transition-all ${
                          isCurrent
                            ? 'bg-muted text-muted-foreground cursor-default'
                            : plan.id === 'free'
                            ? 'bg-muted text-foreground'
                            : 'bg-primary text-primary-foreground shadow-fab active:scale-[0.98]'
                        }`}
                      >
                        {isCurrent
                          ? (trialActive ? `Trial – ${trialDays} days left` : 'Current Plan')
                          : plan.id === 'free'
                          ? 'Downgrade to Free'
                          : `Upgrade to ${plan.name}`}
                      </button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}

          {/* ── Our Champions (Auto-rotating testimonials) ── */}
          <div className="mt-6">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-accent" /> Our Champions
            </h3>
            <div className="relative h-[140px] overflow-hidden rounded-2xl border border-border bg-card">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTestimonial}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 p-4"
                >
                  {(() => {
                    const t = testimonials[currentTestimonial];
                    return (
                      <div className="flex flex-col h-full">
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${t.color}`}>
                            {t.initials}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-foreground">{t.name}</p>
                            <p className="text-[10px] text-primary font-medium">Lost {t.loss}</p>
                          </div>
                          <div className="flex gap-0.5">
                            {Array.from({ length: t.rating }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-accent text-accent" />
                            ))}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed flex-1">"{t.quote}"</p>
                      </div>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
              {/* Dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {testimonials.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === currentTestimonial ? 'bg-primary w-4' : 'bg-border'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Still confused? ── */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground text-center">Still confused?</p>
            <div className="flex items-center justify-center mt-2 gap-2">
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-bold text-primary border-2 border-card">AS</div>
                <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center text-[9px] font-bold text-accent-foreground border-2 border-card">RK</div>
                <div className="w-7 h-7 rounded-full bg-destructive/15 flex items-center justify-center text-[9px] font-bold text-destructive border-2 border-card">MN</div>
              </div>
              <button
                onClick={() => toast('Opening consultant chat...', { icon: '💬' })}
                className="text-xs font-semibold text-primary flex items-center gap-1"
              >
                Talk to senior consultants <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground text-center pb-4 mt-4">
            Simulated purchase – no actual payment processed.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
