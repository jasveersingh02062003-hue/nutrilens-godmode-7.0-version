import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, Brain, Utensils, BarChart3, Dumbbell, Sun, Heart, Archive, ChevronDown, Star, Users, TrendingUp, Sparkles, Shield, Check } from 'lucide-react';
import { setPlan } from '@/lib/subscription-service';
import { toast } from 'sonner';

interface Props {
  name: string;
  onUpgrade: () => void;
  onSkip: () => void;
}

const features = [
  { icon: Camera, label: 'Unlimited AI Food Scans', desc: 'Snap any meal for instant nutrition data' },
  { icon: Brain, label: 'Monica AI Coach — Unlimited', desc: 'Personal nutrition guidance, anytime' },
  { icon: Utensils, label: 'Personalised Meal Plans', desc: 'Tailored to your body, goals & budget' },
  { icon: Dumbbell, label: 'Smart Exercise Adjustments', desc: 'Auto-rebalance meals after workouts' },
  { icon: Sun, label: 'Weather & Skin-Aware Tips', desc: 'Nutrition that adapts to your day' },
  { icon: BarChart3, label: 'Full Progress History', desc: 'Complete timeline with photos & insights' },
  { icon: Archive, label: 'Unlimited Food Archive', desc: 'Every meal memory, forever' },
  { icon: Heart, label: 'Missed Meal Recovery', desc: 'Smart redistribution when life happens' },
];

const stats = [
  { value: '4.2 kg', label: 'Avg weight lost', sub: 'in 8 weeks' },
  { value: '92%', label: 'Consistency', sub: 'rate achieved' },
  { value: '4.8★', label: 'User rating', sub: '10K+ users' },
];

type PlanDuration = '12months' | '1month';

export default function SubscriptionScreen({ name, onUpgrade, onSkip }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<PlanDuration>('12months');
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const handleUpgrade = () => {
    setPlan('premium');
    toast.success('Welcome to NutriLens Pro! 🎉');
    onUpgrade();
  };

  const price = selectedPlan === '12months' ? '₹125' : '₹149';
  const totalPrice = selectedPlan === '12months' ? '₹1,499/year' : '₹149/month';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Gradient Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden pt-12 pb-8 px-6"
        style={{
          background: 'linear-gradient(165deg, hsl(var(--primary)) 0%, hsl(145 35% 28%) 50%, hsl(141 47% 33%) 100%)',
        }}
      >
        {/* Animated sparkle particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary-foreground/30"
            style={{ left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [0.8, 1.4, 0.8],
            }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center relative z-10"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-foreground/15 backdrop-blur-sm mb-4">
            <Sparkles className="w-3 h-3 text-primary-foreground" />
            <span className="text-[10px] font-bold text-primary-foreground tracking-wider uppercase">NutriLens Pro</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-primary-foreground leading-tight">
            {name}, reach your goal<br />
            <span className="text-accent">2× faster</span> with AI
          </h1>
          <p className="text-sm text-primary-foreground/70 mt-2 max-w-[280px] mx-auto">
            Personalised nutrition coaching powered by AI that adapts to your lifestyle
          </p>
        </motion.div>
      </motion.div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 -mt-4 pb-40">
        {/* Plan Selector Cards */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex gap-3 mb-6"
        >
          {/* 12 Months */}
          <button
            onClick={() => setSelectedPlan('12months')}
            className={`flex-1 relative rounded-2xl border-2 p-4 transition-all ${
              selectedPlan === '12months'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border bg-card'
            }`}
          >
            {selectedPlan === '12months' && (
              <motion.div
                layoutId="plan-check"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
              >
                <Check className="w-3.5 h-3.5 text-primary-foreground" />
              </motion.div>
            )}
            <span className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[9px] font-bold">
              SAVE 70%
            </span>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">12 MONTHS</p>
            <p className="text-xl font-bold text-foreground mt-1">₹125<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
            <p className="text-[10px] text-muted-foreground">₹1,499 billed yearly</p>
          </button>

          {/* 1 Month */}
          <button
            onClick={() => setSelectedPlan('1month')}
            className={`flex-1 relative rounded-2xl border-2 p-4 transition-all ${
              selectedPlan === '1month'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border bg-card'
            }`}
          >
            {selectedPlan === '1month' && (
              <motion.div
                layoutId="plan-check"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
              >
                <Check className="w-3.5 h-3.5 text-primary-foreground" />
              </motion.div>
            )}
            <p className="text-[10px] text-muted-foreground font-medium mt-1">1 MONTH</p>
            <p className="text-xl font-bold text-foreground mt-1">₹149<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
            <p className="text-[10px] text-muted-foreground">Billed monthly</p>
          </button>
        </motion.div>

        {/* Features Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Here's what you get
          </h3>
          <div className="space-y-2.5">
            {(showAllFeatures ? features : features.slice(0, 4)).map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.06 }}
                className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
          {!showAllFeatures && (
            <button
              onClick={() => setShowAllFeatures(true)}
              className="w-full mt-2 py-2.5 text-xs font-semibold text-primary flex items-center justify-center gap-1"
            >
              Show all features <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="mt-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Trusted by 10,000+ users</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="bg-card border border-border rounded-xl p-3 text-center"
              >
                <p className="text-lg font-bold text-primary">{s.value}</p>
                <p className="text-[10px] font-semibold text-foreground">{s.label}</p>
                <p className="text-[9px] text-muted-foreground">{s.sub}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Testimonial */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="mt-5 bg-card border border-border rounded-2xl p-4"
        >
          <div className="flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-accent text-accent" />
            ))}
          </div>
          <p className="text-xs text-foreground leading-relaxed italic">
            "Lost 6 kg in 2 months without giving up my favourite foods. Monica's tips are like having a nutritionist in my pocket!"
          </p>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">— Priya S., Mumbai</p>
        </motion.div>
      </div>

      {/* Sticky Bottom CTA */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border px-5 py-4 pb-6 z-50"
      >
        <button
          onClick={onSkip}
          className="w-full text-center text-xs text-muted-foreground mb-3 py-1"
        >
          Continue with Free
        </button>
        <button
          onClick={handleUpgrade}
          className="w-full py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 shadow-fab transition-transform active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(141 47% 33%) 100%)',
            color: 'hsl(var(--primary-foreground))',
          }}
        >
          <Sparkles className="w-4 h-4" />
          Get NutriLens Pro for {price}/mo
        </button>
        <p className="text-center text-[9px] text-muted-foreground mt-2">
          Cancel anytime · {totalPrice} · Simulated purchase
        </p>
      </motion.div>
    </div>
  );
}
