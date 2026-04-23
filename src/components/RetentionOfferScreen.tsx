import { scopedGet, scopedSet } from '@/lib/scoped-storage';
import { motion } from 'framer-motion';
import { X, Sparkles, Clock, Zap, Gift } from 'lucide-react';
import { mockSubscribe } from '@/lib/subscription-service';
import { toast } from 'sonner';

interface Props {
  onAccept: () => void;
  onDismiss: () => void;
}

export default function RetentionOfferScreen({ onAccept, onDismiss }: Props) {
  const handleAccept = async () => {
    const ok = await mockSubscribe('premium', 365);
    scopedSet('retention_offer_shown', 'true');
    if (ok) {
      toast.success('Welcome to NutriLens Pro! 🎉 Special offer activated');
    } else {
      toast.info('Payment integration coming soon — your offer is saved.');
    }
    onAccept();
  };

  const handleDismiss = () => {
    scopedSet('retention_offer_shown', 'true');
    onDismiss();
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(170deg, hsl(var(--primary)) 0%, hsl(145 30% 16%) 40%, hsl(var(--background)) 70%)',
        }}
      />

      {/* Animated glow orbs */}
      <motion.div
        className="absolute w-64 h-64 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, hsl(var(--accent)), transparent)', top: '5%', right: '-15%' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute w-48 h-48 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent)', bottom: '25%', left: '-10%' }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
      />

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-5 right-5 z-20 w-9 h-9 rounded-full bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center"
      >
        <X className="w-4 h-4 text-primary-foreground" />
      </button>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-32">
        {/* Gift animation */}
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
          className="mb-6"
        >
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(var(--accent)), hsl(38 80% 58%))' }}>
            <Gift className="w-10 h-10 text-accent-foreground" />
          </div>
        </motion.div>

        {/* Urgency badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full mb-4"
          style={{ background: 'hsl(var(--accent) / 0.2)' }}
        >
          <Clock className="w-3 h-3 text-accent" />
          <span className="text-xs font-bold text-accent">One-Time Offer · Today Only</span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-3xl font-display font-bold text-primary-foreground text-center leading-tight"
        >
          Wait! Get <span className="text-accent">68% OFF</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-sm text-primary-foreground/60 mt-2 text-center max-w-[260px]"
        >
          We don't want you to miss out on the full NutriLens experience
        </motion.p>

        {/* Pricing */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center"
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-lg text-primary-foreground/40 line-through font-medium">₹1,788</span>
            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl font-display font-bold text-primary-foreground"
            >
              ₹599
            </motion.span>
          </div>
          <p className="text-xs text-primary-foreground/50 mt-1">for the whole year · just ₹50/month</p>
        </motion.div>

        {/* Urgency text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-5 text-xs font-semibold text-accent text-center flex items-center gap-1.5"
        >
          <Zap className="w-3 h-3" />
          You won't see this offer again!
        </motion.p>

        {/* Quick benefits */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-6 space-y-2 w-full max-w-xs"
        >
          {['Unlimited AI scans & Monica', 'Personalised plans for your body', 'Full history & progress tracking'].map((text, i) => (
            <div key={i} className="flex items-center gap-2.5 text-primary-foreground/80">
              <div className="w-5 h-5 rounded-full bg-primary-foreground/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px]">✓</span>
              </div>
              <span className="text-xs">{text}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed bottom-0 left-0 right-0 px-6 py-5 pb-8 z-20"
      >
        <button
          onClick={handleAccept}
          className="w-full py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--accent)), hsl(38 80% 58%))',
            color: 'hsl(var(--accent-foreground))',
            boxShadow: '0 8px 24px -4px hsl(38 70% 52% / 0.4)',
          }}
        >
          <Sparkles className="w-4 h-4" />
          Avail This One-Time Offer
        </button>
        <button
          onClick={handleDismiss}
          className="w-full mt-3 text-center text-xs text-muted-foreground py-2"
        >
          No thanks, continue with Free
        </button>
      </motion.div>
    </div>
  );
}
