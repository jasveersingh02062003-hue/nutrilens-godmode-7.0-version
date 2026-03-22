// ============================================
// NutriLens AI – Enhanced Educational Pop-up for Missed Meals
// ============================================

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { getEducationContent, markEducationShown, wasEducationShown, type EducationContent } from '@/lib/education-service';

interface Props {
  open: boolean;
  onClose: () => void;
  goal: string;
  mealType: string;
  mealLabel: string;
  date: string;
  userName?: string;
}

// Animated emoji component with bounce + float
function AnimatedHero({ emoji }: { emoji: string }) {
  return (
    <motion.div
      className="relative"
      initial={{ scale: 0, rotate: -30 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.1 }}
    >
      {/* Glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/20"
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 80, height: 80, left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}
      />
      <motion.span
        className="text-6xl block"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {emoji}
      </motion.span>
    </motion.div>
  );
}

// Animated metabolism/energy meter
function EnergyMeter() {
  return (
    <div className="flex items-center gap-1 mt-2">
      {[0, 1, 2, 3, 4].map(i => (
        <motion.div
          key={i}
          className="w-6 h-2 rounded-full bg-primary/30"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1, backgroundColor: i < 3 ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}
          transition={{ delay: 0.4 + i * 0.12, duration: 0.3 }}
          style={{ originX: 0 }}
        />
      ))}
      <motion.span
        className="text-[10px] font-semibold text-primary ml-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        60%
      </motion.span>
    </div>
  );
}

// Animated clock
function AnimatedClock() {
  return (
    <motion.div className="relative w-10 h-10 mx-auto mt-1">
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary/40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3 }}
      />
      {/* Hour hand */}
      <motion.div
        className="absolute w-0.5 h-3 bg-primary rounded-full"
        style={{ left: '50%', bottom: '50%', originX: '50%', originY: '100%', marginLeft: -1 }}
        initial={{ rotate: 0 }}
        animate={{ rotate: 150 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      />
      {/* Minute hand */}
      <motion.div
        className="absolute w-0.5 h-4 bg-primary/60 rounded-full"
        style={{ left: '50%', bottom: '50%', originX: '50%', originY: '100%', marginLeft: -1 }}
        initial={{ rotate: 0 }}
        animate={{ rotate: 300 }}
        transition={{ delay: 0.5, duration: 1.2 }}
      />
    </motion.div>
  );
}

export default function MissedMealEducation({ open, onClose, goal, mealType, mealLabel, date, userName }: Props) {
  const content = getEducationContent(goal, mealType);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
  }, []);

  // Mark as shown when opened
  useEffect(() => {
    if (open && date && mealType) {
      markEducationShown(date, mealType);
    }
  }, [open, date, mealType]);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden border-0">
        <div className="relative">
          {/* Animated Header */}
          <div className="bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 px-6 pt-8 pb-6 text-center">
            {/* Floating particles */}
            {!prefersReducedMotion && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {['🥗', '🍳', '💧', '🥑', '🍎'].map((emoji, i) => (
                  <motion.span
                    key={i}
                    className="absolute text-lg opacity-20"
                    style={{ left: `${15 + i * 18}%`, top: '20%' }}
                    animate={{ y: [0, -20, 0], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
                  >
                    {emoji}
                  </motion.span>
                ))}
              </div>
            )}

            <AnimatedHero emoji={content.animationEmoji} />

            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <h3 className="text-lg font-bold text-foreground mt-3">{content.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {userName ? `${userName}, you` : 'You'} missed {mealLabel}
              </p>
            </motion.div>

            {/* Energy Meter */}
            {!prefersReducedMotion && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex justify-center"
              >
                <EnergyMeter />
              </motion.div>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-3.5">
            {/* Monika Chat Bubble */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
                🤖
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm p-3 flex-1">
                <p className="text-xs text-foreground leading-relaxed">{content.message}</p>
              </div>
            </motion.div>

            {/* Clock Animation */}
            {!prefersReducedMotion && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2 justify-center"
              >
                <AnimatedClock />
                <p className="text-[10px] text-muted-foreground">Meal timing matters!</p>
              </motion.div>
            )}

            {/* Pro Tip */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="bg-primary/5 border border-primary/20 rounded-xl p-3"
            >
              <p className="text-[11px] font-semibold text-primary mb-1">💡 Pro Tip</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{content.tip}</p>
            </motion.div>

            {/* Fun Fact */}
            {content.funFact && (
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="bg-accent/5 border border-accent/20 rounded-xl p-3"
              >
                <p className="text-[11px] font-semibold text-accent mb-1">📊 Did you know?</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{content.funFact}</p>
              </motion.div>
            )}

            {/* Dismiss */}
            <motion.button
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-transform"
            >
              Got it! 👍
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
