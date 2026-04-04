import { scopedGet, scopedSet } from '@/lib/scoped-storage';
// ============================================
// NutriLens AI – Profile Completion Nudge
// ============================================
// Multi-step inline questionnaire for lifestyle fields.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, ChevronRight, Check, Home, Utensils, Building2, Plane } from 'lucide-react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import type { UserProfile } from '@/lib/store';

const NUDGE_PREFIX = 'nutrilens_profile_nudge_dismissed_';

interface Props {
  onOpenProfile: () => void;
}

type Step = 'intro' | 'living' | 'travel' | 'kitchen' | 'workplace' | 'carries' | 'done';

const STEPS: Step[] = ['living', 'travel', 'kitchen', 'workplace', 'carries'];

export default function ProfileCompletionNudge({ onOpenProfile }: Props) {
  const { profile, loadedUserId, updateProfile } = useUserProfile();
  const nudgeKey = `${NUDGE_PREFIX}${loadedUserId || 'anon'}`;
  const [dismissed, setDismissed] = useState(() => scopedGet(nudgeKey) === 'true');
  const [step, setStep] = useState<Step>('intro');
  const [stepIndex, setStepIndex] = useState(-1);

  // Local answers
  const [living, setLiving] = useState<UserProfile['livingSituation']>(undefined);
  const [travel, setTravel] = useState<UserProfile['travelFrequency']>(undefined);
  const [kitchen, setKitchen] = useState<string[]>([]);
  const [workplace, setWorkplace] = useState<string[]>([]);
  const [carries, setCarries] = useState<UserProfile['carriesFood']>(undefined);

  if (dismissed || !profile) return null;

  const hasLifestyle = profile.travelFrequency || (profile.kitchenAppliances && profile.kitchenAppliances.length > 0) ||
    (profile.workplaceFacilities && profile.workplaceFacilities.length > 0) || profile.carriesFood || profile.livingSituation;

  if (hasLifestyle) return null;

  const handleDismiss = () => {
    scopedSet(nudgeKey, 'true');
    setDismissed(true);
  };

  const goNext = () => {
    const next = stepIndex + 1;
    if (next >= STEPS.length) {
      // Save all answers
      updateProfile({
        livingSituation: living,
        travelFrequency: travel,
        kitchenAppliances: kitchen,
        workplaceFacilities: workplace,
        carriesFood: carries,
      });
      setStep('done');
      setTimeout(() => handleDismiss(), 2000);
    } else {
      setStepIndex(next);
      setStep(STEPS[next]);
    }
  };

  const progress = step === 'intro' ? 0 : step === 'done' ? 100 : Math.round(((stepIndex + 1) / STEPS.length) * 100);

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const renderChip = (label: string, selected: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border ${
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-muted/40 text-foreground border-border hover:bg-muted'
      }`}
    >
      {label}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-accent/20 bg-accent/5 px-3.5 py-3"
    >
      {/* Progress bar */}
      {step !== 'intro' && step !== 'done' && (
        <div className="h-1 rounded-full bg-muted/30 mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* INTRO */}
        {step === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Complete your lifestyle profile</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  5 quick questions about your daily life — we'll tailor meals to fit perfectly
                </p>
                <button
                  onClick={() => { setStepIndex(0); setStep(STEPS[0]); }}
                  className="flex items-center gap-0.5 mt-2 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Start <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <button
                onClick={handleDismiss}
                className="shrink-0 w-6 h-6 rounded-full bg-muted/60 flex items-center justify-center"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}

        {/* LIVING SITUATION */}
        {step === 'living' && (
          <motion.div key="living" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-2 mb-2">
              <Home className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">Who do you live with?</p>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2.5">Helps us suggest family-sized or single recipes</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {renderChip('🏠 Alone', living === 'alone', () => setLiving('alone'))}
              {renderChip('👨‍👩‍👧 Family', living === 'family', () => setLiving('family'))}
              {renderChip('🤝 Shared / Roommates', living === 'shared', () => setLiving('shared'))}
            </div>
            <button onClick={goNext} className="flex items-center gap-1 text-[11px] font-semibold text-primary">
              {living ? 'Next' : 'Skip'} <ChevronRight className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        {/* TRAVEL */}
        {step === 'travel' && (
          <motion.div key="travel" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-2 mb-2">
              <Plane className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">How often do you travel?</p>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2.5">We'll suggest travel-friendly meals when needed</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {renderChip('🏡 Rarely', travel === 'never', () => setTravel('never'))}
              {renderChip('✈️ Sometimes', travel === 'sometimes', () => setTravel('sometimes'))}
              {renderChip('🧳 Often', travel === 'often', () => setTravel('often'))}
            </div>
            <button onClick={goNext} className="flex items-center gap-1 text-[11px] font-semibold text-primary">
              {travel ? 'Next' : 'Skip'} <ChevronRight className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        {/* KITCHEN APPLIANCES */}
        {step === 'kitchen' && (
          <motion.div key="kitchen" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">What's in your kitchen?</p>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2.5">Select all appliances you have</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {['Microwave', 'Air Fryer', 'Mixer/Blender', 'Oven', 'Pressure Cooker', 'Toaster'].map(item =>
                renderChip(item, kitchen.includes(item), () => toggleItem(kitchen, item, setKitchen))
              )}
            </div>
            <button onClick={goNext} className="flex items-center gap-1 text-[11px] font-semibold text-primary">
              {kitchen.length > 0 ? 'Next' : 'Skip'} <ChevronRight className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        {/* WORKPLACE */}
        {step === 'workplace' && (
          <motion.div key="workplace" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">What does your workplace have?</p>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2.5">Helps plan meals you can actually eat at work</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {['Microwave', 'Fridge', 'Canteen', 'Vending Machine', 'Hot Water', 'Nothing'].map(item =>
                renderChip(item, workplace.includes(item), () => toggleItem(workplace, item, setWorkplace))
              )}
            </div>
            <button onClick={goNext} className="flex items-center gap-1 text-[11px] font-semibold text-primary">
              {workplace.length > 0 ? 'Next' : 'Skip'} <ChevronRight className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        {/* CARRIES FOOD */}
        {step === 'carries' && (
          <motion.div key="carries" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">Do you carry food from home?</p>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2.5">We'll prioritize pack-friendly or on-the-go meals</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {renderChip('🍱 Always', carries === 'always', () => setCarries('always'))}
              {renderChip('🤷 Sometimes', carries === 'sometimes', () => setCarries('sometimes'))}
              {renderChip('🚫 Never', carries === 'never', () => setCarries('never'))}
            </div>
            <button onClick={goNext} className="flex items-center gap-1 text-[11px] font-semibold text-primary">
              {carries ? 'Finish' : 'Skip'} <ChevronRight className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">All set! 🎉</p>
                <p className="text-[10px] text-muted-foreground">Your meals will now be tailored to your lifestyle</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
