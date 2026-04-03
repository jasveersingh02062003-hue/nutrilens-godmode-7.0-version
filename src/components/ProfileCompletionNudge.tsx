import { scopedGet, scopedSet } from '@/lib/scoped-storage';
// ============================================
// NutriLens AI – Profile Completion Nudge
// ============================================
// Shows a one-time prompt when lifestyle fields are empty.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Briefcase, ChevronRight } from 'lucide-react';
import { useUserProfile } from '@/contexts/UserProfileContext';


const NUDGE_PREFIX = 'nutrilens_profile_nudge_dismissed_';

interface Props {
  onOpenProfile: () => void;
}

export default function ProfileCompletionNudge({ onOpenProfile }: Props) {
  const { profile, loadedUserId } = useUserProfile();
  const nudgeKey = `${NUDGE_PREFIX}${loadedUserId || 'anon'}`;
  const [dismissed, setDismissed] = useState(() => scopedGet(nudgeKey) === 'true');

  if (dismissed || !profile) return null;

  // Check if lifestyle fields are mostly empty
  const hasLifestyle = profile.travelFrequency || (profile.kitchenAppliances && profile.kitchenAppliances.length > 0) ||
    (profile.workplaceFacilities && profile.workplaceFacilities.length > 0) || profile.carriesFood || profile.livingSituation;

  if (hasLifestyle) return null;

  const handleDismiss = () => {
    scopedSet(nudgeKey, 'true');
    setDismissed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-accent/20 bg-accent/5 px-3.5 py-3"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <Briefcase className="w-4 h-4 text-accent-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">Complete your work profile</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
            Tell us about your travel, kitchen, and workplace — we'll suggest meals that fit your real life
          </p>
          <button
            onClick={() => { onOpenProfile(); handleDismiss(); }}
            className="flex items-center gap-0.5 mt-2 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Complete now <ChevronRight className="w-3 h-3" />
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
  );
}
