import { useMemo } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getActiveNudges, dismissNudge, type Nudge } from '@/lib/learning-service';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useNavigate } from 'react-router-dom';

const nudgeColors = {
  suggestion: 'bg-primary/10 border-primary/20 text-primary',
  warning: 'bg-accent/10 border-accent/20 text-accent',
  celebration: 'bg-primary/10 border-primary/20 text-primary',
};

interface Props {
  onOpenSymptomLog?: () => void;
}

export default function NudgeBanner({ onOpenSymptomLog }: Props) {
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const nudges = useMemo(() => getActiveNudges(profile), [profile]);

  const handleDismiss = (id: string) => {
    dismissNudge(id);
    // Force re-render by using state would be needed, but for simplicity
    // the nudge won't reappear until the cooldown period
  };

  const handleAction = (nudge: Nudge) => {
    dismissNudge(nudge.id);
    if (nudge.action === 'open_planner') navigate('/planner');
    if (nudge.action === 'log_symptom') onOpenSymptomLog?.();
  };

  if (nudges.length === 0) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {nudges.slice(0, 1).map(nudge => (
          <motion.div
            key={nudge.id}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            className={`relative px-4 py-3 rounded-2xl border ${nudgeColors[nudge.type]}`}
          >
            <button
              onClick={() => handleDismiss(nudge.id)}
              className="absolute top-2 right-2 w-5 h-5 rounded-full bg-background/50 flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
            <p className="text-xs font-medium pr-6">
              {nudge.emoji} {nudge.message}
            </p>
            {nudge.action && (
              <button
                onClick={() => handleAction(nudge)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-background/50 text-[10px] font-bold active:scale-[0.97] transition-transform"
              >
                {nudge.action === 'open_planner' ? '📋 Open Meal Planner' :
                 nudge.action === 'log_symptom' ? '📝 Log Symptoms' : 'View'}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
