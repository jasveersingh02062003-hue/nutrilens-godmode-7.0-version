import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Check, X, Clock } from 'lucide-react';
import { getProfile, toLocalDateKey, getDailyLog } from '@/lib/store';
import { isGymDay, getGymCheckInStatus, saveGymCheckIn, estimateCaloriesBurned } from '@/lib/gym-service';
import { shouldShowCheckIn, getGymMissedAdjustment, getLowSleepTip } from '@/lib/gym-meal-engine';
import { Slider } from '@/components/ui/slider';

interface GymCheckInCardProps {
  onRefresh?: () => void;
}

export default function GymCheckInCard({ onRefresh }: GymCheckInCardProps) {
  const profile = getProfile();
  const today = toLocalDateKey(new Date());
  const status = getGymCheckInStatus(today);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [duration, setDuration] = useState(profile?.gym?.durationMinutes || 45);
  const [intensity, setIntensity] = useState(profile?.gym?.intensity || 'moderate');
  const [logged, setLogged] = useState(status.attended !== null);

  const estimatedCals = useMemo(
    () => estimateCaloriesBurned(profile?.weightKg || 70, duration, intensity),
    [profile?.weightKg, duration, intensity]
  );

  const sleepTip = useMemo(() => getLowSleepTip(profile), [profile]);

  if (!profile?.gym?.goer || !isGymDay(profile, today) || logged || dismissed) return null;
  if (snoozed) return null;
  if (!shouldShowCheckIn(profile)) return null;

  const handleYes = () => setExpanded(true);

  const handleNo = () => {
    saveGymCheckIn(today, false);
    setLogged(true);
    onRefresh?.();
  };

  const handleSnooze = () => {
    setSnoozed(true);
    // Auto-unsnooze after 1 hour
    setTimeout(() => setSnoozed(false), 60 * 60 * 1000);
  };

  const handleSave = () => {
    saveGymCheckIn(today, true, duration, intensity);
    setLogged(true);
    onRefresh?.();
  };

  const gymHour = profile.gym?.specificHour;
  const timeLabel = gymHour != null
    ? `Scheduled at ${gymHour > 12 ? gymHour - 12 : gymHour}:00 ${gymHour >= 12 ? 'PM' : 'AM'}`
    : "It's a scheduled gym day";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Did you work out today? 🏋️</p>
            <p className="text-[10px] text-muted-foreground">{timeLabel}</p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {sleepTip && (
        <div className="bg-accent/5 border border-accent/15 rounded-xl px-3 py-2">
          <p className="text-[10px] text-muted-foreground">😴 {sleepTip}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!expanded ? (
          <motion.div key="buttons" className="flex gap-2">
            <button
              onClick={handleYes}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              ✅ Yes
            </button>
            <button
              onClick={handleNo}
              className="flex-1 py-2.5 rounded-xl bg-muted text-foreground text-sm font-semibold"
            >
              ❌ No
            </button>
            <button
              onClick={handleSnooze}
              className="py-2.5 px-3 rounded-xl bg-muted text-muted-foreground text-sm font-semibold"
              title="Snooze 1 hour"
            >
              <Clock className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            {/* Duration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Duration</p>
                <p className="text-sm font-bold text-foreground">{duration} min</p>
              </div>
              <Slider
                value={[duration]}
                onValueChange={([v]) => setDuration(v)}
                min={15} max={120} step={5}
              />
            </div>

            {/* Intensity */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Intensity</p>
              <div className="flex gap-2">
                {(['light', 'moderate', 'intense'] as const).map(i => (
                  <button
                    key={i}
                    onClick={() => setIntensity(i)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      intensity === i
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i === 'light' ? '🧘 Light' : i === 'moderate' ? '💪 Moderate' : '🔥 Intense'}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated calories */}
            <div className="flex items-center justify-between bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5">
              <p className="text-xs text-muted-foreground">Estimated burn</p>
              <p className="text-sm font-bold text-primary">~{estimatedCals} kcal</p>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Log Workout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
