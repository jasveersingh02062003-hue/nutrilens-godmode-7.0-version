import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, X, Dumbbell, Timer, UtensilsCrossed } from 'lucide-react';
import { getProfile, toLocalDateKey, getDailyLog } from '@/lib/store';
import { isGymDay, getSpecificHourForDate } from '@/lib/gym-service';
import { shouldShowPreWorkout, getPreWorkoutSuggestion, getPreWorkoutCountdown, getExactEatTime } from '@/lib/gym-meal-engine';

export default function PreWorkoutCard() {
  const profile = getProfile();
  const today = toLocalDateKey(new Date());
  const log = getDailyLog(today);
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const suggestion = useMemo(() => getPreWorkoutSuggestion(profile), [profile]);

  // Update countdown every minute
  useEffect(() => {
    const update = () => setCountdown(getPreWorkoutCountdown(profile));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [profile]);

  if (!profile?.gym?.goer || !isGymDay(profile, today) || dismissed) return null;
  if (profile.gym.fastedTraining) return null; // fasted training - skip pre-workout
  if (!shouldShowPreWorkout(profile)) return null;
  if (log.gym?.attended != null) return null; // already checked in
  if (!suggestion) return null;

  const gymHour = getSpecificHourForDate(profile, today) ?? profile.gym.specificHour ?? 7;
  const period = gymHour < 12 ? 'AM' : 'PM';
  const displayHour = gymHour > 12 ? gymHour - 12 : gymHour === 0 ? 12 : gymHour;
  const exactEatTime = getExactEatTime(profile);

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

      {/* Countdown timer */}
      {countdown != null && countdown > 0 && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-xl px-3 py-2">
          <Timer className="w-3.5 h-3.5 text-primary" />
          <p className="text-[11px] text-foreground font-medium">
            {exactEatTime ? `Eat at ${exactEatTime}` : `Eat in ${countdown} min`}
            {countdown > 0 && ` · ${countdown} min left`}
          </p>
        </div>
      )}

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

      <div className="flex gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Dumbbell className="w-4 h-4" /> Ready! 💪
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="py-2.5 px-4 rounded-xl bg-muted text-muted-foreground text-xs font-semibold"
        >
          <UtensilsCrossed className="w-3.5 h-3.5 inline mr-1" />
          Already ate
        </button>
      </div>
    </motion.div>
  );
}
