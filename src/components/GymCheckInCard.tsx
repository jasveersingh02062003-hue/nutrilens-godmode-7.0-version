import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Check, X, Clock, Calendar, AlertTriangle } from 'lucide-react';
import { getProfile, toLocalDateKey, getDailyLog } from '@/lib/store';
import { isGymDay, getGymCheckInStatus, saveGymCheckIn, estimateCaloriesBurned, markRestDay, getSpecificHourForDate } from '@/lib/gym-service';
import { shouldShowCheckIn, getGymMissedAdjustment, getLowSleepTip, getSleepDuration } from '@/lib/gym-meal-engine';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import WorkoutLogger from '@/components/WorkoutLogger';

interface GymCheckInCardProps {
  onRefresh?: () => void;
}

const MISS_REASONS = [
  { value: 'tired' as const, label: '😴 Too Tired', recovery: false },
  { value: 'injury' as const, label: '🤕 Injury', recovery: true },
  { value: 'sick' as const, label: '🤒 Sick', recovery: true },
  { value: 'no_time' as const, label: '⏰ No Time', recovery: false },
  { value: 'other' as const, label: '🤷 Other', recovery: false },
];

export default function GymCheckInCard({ onRefresh }: GymCheckInCardProps) {
  const profile = getProfile();
  const today = toLocalDateKey(new Date());
  const status = getGymCheckInStatus(today);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [showMissReason, setShowMissReason] = useState(false);
  const [duration, setDuration] = useState(profile?.gym?.durationMinutes || 45);
  const [intensity, setIntensity] = useState(profile?.gym?.intensity || 'moderate');
  const [actualHour, setActualHour] = useState(getSpecificHourForDate(profile, today) ?? profile?.gym?.specificHour ?? 7);
  const [logged, setLogged] = useState(status.attended !== null);

  const estimatedCals = useMemo(
    () => estimateCaloriesBurned(profile?.weightKg || 70, duration, intensity),
    [profile?.weightKg, duration, intensity]
  );

  const sleepTip = useMemo(() => getLowSleepTip(profile), [profile]);
  const sleepHours = useMemo(() => getSleepDuration(profile), [profile]);
  const isLowSleep = sleepHours != null && sleepHours < 6;

  if (!profile?.gym?.goer || !isGymDay(profile, today) || logged || dismissed) return null;
  if (snoozed) return null;

  const handleYes = () => {
    if (isLowSleep) {
      // Pre-select light intensity for low sleep days
      setIntensity('light');
    }
    setExpanded(true);
  };

  const handleNo = () => {
    setShowMissReason(true);
  };

  const handleMissReasonSelect = (reason: 'tired' | 'injury' | 'sick' | 'no_time' | 'other') => {
    saveGymCheckIn(today, false, undefined, undefined, undefined, reason);
    setLogged(true);
    
    const reasonInfo = MISS_REASONS.find(r => r.value === reason);
    if (reasonInfo?.recovery) {
      toast.info('🩺 Recovery mode: We\'ll increase protein and reduce intensity recommendations for the next few days.');
    } else {
      const adj = getGymMissedAdjustment(profile);
      if (adj.calorieReduction > 0) {
        toast.info(`📉 Calories reduced by ${adj.calorieReduction} kcal for today (missed workout adjustment).`);
      }
    }
    
    onRefresh?.();
  };

  const handleSnooze = () => {
    setSnoozed(true);
    setTimeout(() => setSnoozed(false), 60 * 60 * 1000);
  };

  const handleSave = () => {
    saveGymCheckIn(today, true, duration, intensity, actualHour);
    setLogged(true);
    toast.success(`💪 Workout logged! ~${estimatedCals} kcal burned.`);
    onRefresh?.();
  };

  const handleMarkRestDay = () => {
    // Mark tomorrow as rest day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toLocalDateKey(tomorrow);
    markRestDay(tomorrowStr);
    toast.success('📅 Tomorrow marked as rest day. Calories will be adjusted.');
  };

  const gymHour = getSpecificHourForDate(profile, today) ?? profile.gym?.specificHour;
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
        {showMissReason ? (
          <motion.div
            key="miss-reason"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2"
          >
            <p className="text-xs font-medium text-muted-foreground">Why did you miss?</p>
            <div className="grid grid-cols-2 gap-2">
              {MISS_REASONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => handleMissReasonSelect(r.value)}
                  className="py-2.5 px-3 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-border transition-colors"
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowMissReason(false)} className="text-xs text-muted-foreground underline">
              ← Back
            </button>
          </motion.div>
        ) : !expanded ? (
          <motion.div key="buttons" className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={handleYes}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
              >
                {isLowSleep ? '✅ Yes, light session' : '✅ Yes'}
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
            </div>
            <button
              onClick={handleMarkRestDay}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Calendar className="w-3 h-3" /> Mark tomorrow as rest day
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            {/* Actual Time Override */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Actual time</p>
                <p className="text-sm font-bold text-foreground">
                  {actualHour > 12 ? actualHour - 12 : actualHour === 0 ? 12 : actualHour}:00 {actualHour >= 12 ? 'PM' : 'AM'}
                </p>
              </div>
              <Slider
                value={[actualHour]}
                onValueChange={([v]) => setActualHour(v)}
                min={0} max={23} step={1}
              />
            </div>

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
