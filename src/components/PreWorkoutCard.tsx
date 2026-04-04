import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, X, Dumbbell } from 'lucide-react';
import { getProfile, toLocalDateKey, getDailyLog } from '@/lib/store';
import { isGymDay } from '@/lib/gym-service';
import { shouldShowPreWorkout, getPreWorkoutSuggestion } from '@/lib/gym-meal-engine';

export default function PreWorkoutCard() {
  const profile = getProfile();
  const today = toLocalDateKey(new Date());
  const log = getDailyLog(today);
  const [dismissed, setDismissed] = useState(false);

  const suggestion = useMemo(() => getPreWorkoutSuggestion(profile), [profile]);

  if (!profile?.gym?.goer || !isGymDay(profile, today) || dismissed) return null;
  if (!shouldShowPreWorkout(profile)) return null;
  if (log.gym?.attended != null) return null; // already checked in
  if (!suggestion) return null;

  const gymHour = profile.gym.specificHour ?? 7;
  const period = gymHour < 12 ? 'AM' : 'PM';
  const displayHour = gymHour > 12 ? gymHour - 12 : gymHour === 0 ? 12 : gymHour;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated p-4 space-y-3 border-l-4 border-l-primary"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Pre-Workout Fuel ⚡</p>
            <p className="text-[10px] text-muted-foreground">Gym at {displayHour}:00 {period} · {suggestion.timing}</p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-foreground mb-1.5">{suggestion.title}</p>
        <div className="flex flex-wrap gap-1.5">
          {suggestion.items.map((item, i) => (
            <span key={i} className="text-[11px] bg-background px-2.5 py-1 rounded-full text-muted-foreground border border-border">
              {item}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-muted-foreground">~{suggestion.calories} kcal</span>
          <span className="text-[10px] text-muted-foreground">~{suggestion.protein}g protein</span>
        </div>
      </div>

      {suggestion.tip && (
        <p className="text-[10px] text-muted-foreground italic">💡 {suggestion.tip}</p>
      )}

      <button
        onClick={() => setDismissed(true)}
        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"
      >
        <Dumbbell className="w-4 h-4" /> Ready to Crush It! 💪
      </button>
    </motion.div>
  );
}
