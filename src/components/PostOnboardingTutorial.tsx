import { scopedGet, scopedSet } from '@/lib/scoped-storage';
// ============================================
// NutriLens AI – Post-Onboarding Tutorial Overlay
// ============================================

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, UtensilsCrossed, TrendingUp, X, ArrowRight, Sparkles } from 'lucide-react';
import { mobileOverlayMotion, mobileOverlayTransition, mobileSheetMotion, mobileSheetTransition, useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

interface PostOnboardingTutorialProps {
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: Camera,
    title: 'Snap Your First Meal',
    description: 'Point your camera at any meal — our AI will instantly detect every item and calculate nutrition.',
    color: 'bg-primary/10 text-primary',
    tip: 'Works with Indian thalis, packaged foods, and restaurant meals!',
  },
  {
    icon: UtensilsCrossed,
    title: 'Set Up Your Meal Plan',
    description: 'Get a personalized weekly plan based on your goals, health conditions, and budget.',
    color: 'bg-accent/10 text-accent',
    tip: 'Visit the Planner tab to generate your first plan.',
  },
  {
    icon: TrendingUp,
    title: 'Track Your Progress',
    description: 'Log meals daily to see your calorie trends, weight changes, and health insights.',
    color: 'bg-secondary/80 text-secondary-foreground',
    tip: 'Check the Progress tab for weekly reports.',
  },
];

export default function PostOnboardingTutorial({ onDismiss }: PostOnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === STEPS.length - 1;

  useBodyScrollLock(true);

  const handleNext = () => {
    if (isLast) {
      scopedSet('tutorial_seen', 'true');
      onDismiss();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      {...mobileOverlayMotion}
      transition={mobileOverlayTransition}
      className="fixed inset-0 z-[60] flex items-end justify-center"
    >
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" />
      <motion.div
        {...mobileSheetMotion}
        transition={mobileSheetTransition}
        className="relative w-full max-w-lg mx-auto max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-card p-6 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
      >
        {/* Progress & Close */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-6 bg-primary' : i < currentStep ? 'w-3 bg-primary/40' : 'w-3 bg-muted'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => { scopedSet('tutorial_seen', 'true'); onDismiss(); }}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            {/* Icon */}
            <div className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center mx-auto mb-5`}>
              <Icon className="w-7 h-7" />
            </div>

            {/* Content */}
            <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.description}</p>

            {/* Tip */}
            <div className="flex items-start gap-2 bg-muted/50 rounded-xl p-3 text-left">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">{step.tip}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          className="mt-6 w-full py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
        >
          {isLast ? (
            <>Let's Go! <Sparkles className="w-4 h-4" /></>
          ) : (
            <>Next <ArrowRight className="w-4 h-4" /></>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
    , document.body
  );
}
