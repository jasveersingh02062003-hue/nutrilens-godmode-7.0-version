import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getWidgetData, type MealSlot, type MealSlotData, getLastLogMode, trackQuickLogVisit, getQuickLogVisits } from '@/lib/widget-data';
import LoggingOptionsSheet from '@/components/LoggingOptionsSheet';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowLeft } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  completed: 'border-primary/40 bg-primary/5 opacity-80',
  late_completed: 'border-amber-400/40 bg-amber-50/10 opacity-85',
  current: 'border-primary bg-primary/10 ring-2 ring-primary/20',
  pending: 'border-border bg-card',
  missed: 'border-border bg-muted/30 opacity-50',
};

interface FeedbackData {
  calories: number;
  protein: number;
  mealLabel: string;
}

export default function QuickLog() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(() => getWidgetData());
  const [sheetMeal, setSheetMeal] = useState<{ type: string; label: string } | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const prevDataRef = useRef(data);
  const visits = useRef(0);

  const refresh = useCallback(() => {
    const newData = getWidgetData();
    const prev = prevDataRef.current;

    // Detect new logging → show feedback
    for (const meal of newData.meals) {
      const prevMeal = prev.meals.find(m => m.type === meal.type);
      if (prevMeal && meal.loggedCalories > prevMeal.loggedCalories) {
        setFeedback({
          calories: meal.loggedCalories - prevMeal.loggedCalories,
          protein: meal.loggedProtein - (prevMeal.loggedProtein || 0),
          mealLabel: meal.label,
        });
        setTimeout(() => setFeedback(null), 3000);
        break;
      }
    }

    prevDataRef.current = newData;
    setData(newData);
  }, []);

  // Event-driven refresh (no polling)
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('nutrilens:update', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('nutrilens:update', handler);
      window.removeEventListener('storage', handler);
    };
  }, [refresh]);

  // Track visits for PWA hint
  useEffect(() => {
    visits.current = trackQuickLogVisit();
  }, []);

  // Deep link handling → unified /log route
  useEffect(() => {
    const meal = searchParams.get('meal') as MealSlot | null;
    const mode = searchParams.get('mode');
    if (!meal) return;

    const label = meal.charAt(0).toUpperCase() + meal.slice(1);
    if (mode === 'camera') {
      navigate(`/?meal=${meal}`, { replace: true });
    } else if (mode) {
      navigate(`/log?meal=${meal}&mode=${mode}`, { replace: true });
    } else {
      setSheetMeal({ type: meal, label });
    }
  }, [searchParams, navigate]);

  const handleMealTap = (slot: MealSlotData) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setSheetMeal({ type: slot.type, label: slot.label });
  };

  const calPct = Math.min(1, 1 - data.remainingCalories / Math.max(1, data.totalCalories));
  const protPct = Math.min(1, 1 - data.remainingProtein / Math.max(1, data.totalProtein));
  const showPwaHint = getQuickLogVisits() >= 3 && !window.matchMedia('(display-mode: standalone)').matches;

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 pt-6 pb-10">
      <div className="w-full max-w-md space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold text-foreground">QuickLog</h1>
          </div>
        </div>

        {/* Inline feedback after logging */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="rounded-2xl bg-primary/10 border border-primary/20 p-4 text-center"
            >
              <p className="text-sm font-semibold text-primary">
                ✅ {feedback.mealLabel} logged!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                +{feedback.calories} kcal · +{feedback.protein}g protein
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border p-5 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Calories remaining */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-muted" />
                  <motion.circle
                    cx="18" cy="18" r="15.5" fill="none" strokeWidth="3"
                    strokeDasharray={`${calPct * 97.4} 97.4`}
                    strokeLinecap="round"
                    className="stroke-primary"
                    animate={{ strokeDasharray: `${calPct * 97.4} 97.4` }}
                    transition={{ duration: 0.7 }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                  🔥
                </span>
              </div>
              <div className="text-center">
                <motion.p
                  key={data.remainingCalories}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-lg font-bold text-foreground"
                >
                  {data.remainingCalories}
                </motion.p>
                <p className="text-[10px] text-muted-foreground">kcal left</p>
              </div>
            </div>

            {/* Protein remaining */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-muted" />
                  <motion.circle
                    cx="18" cy="18" r="15.5" fill="none" strokeWidth="3"
                    strokeDasharray={`${protPct * 97.4} 97.4`}
                    strokeLinecap="round"
                    className="stroke-secondary"
                    animate={{ strokeDasharray: `${protPct * 97.4} 97.4` }}
                    transition={{ duration: 0.7 }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                  💪
                </span>
              </div>
              <div className="text-center">
                <motion.p
                  key={data.remainingProtein}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-lg font-bold text-foreground"
                >
                  {data.remainingProtein}g
                </motion.p>
                <p className="text-[10px] text-muted-foreground">protein left</p>
              </div>
            </div>
          </div>

          {/* Dynamic message */}
          <p className="text-center text-sm font-medium text-muted-foreground">{data.message}</p>
        </motion.div>

        {/* Meal buttons */}
        <div className="grid grid-cols-2 gap-3">
          {data.meals.map((slot, i) => (
            <motion.button
              key={slot.type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => handleMealTap(slot)}
              className={`relative p-4 rounded-2xl border-2 transition-all active:scale-[0.96] flex flex-col items-center gap-2 ${STATUS_STYLES[slot.status]}`}
            >
              {slot.status === 'completed' && (
                <span className="absolute top-2 right-2 text-xs">✅</span>
              )}
              {slot.status === 'late_completed' && (
                <span className="absolute top-2 right-2 text-[10px]">⏰✔</span>
              )}
              {slot.status === 'current' && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
              <span className="text-2xl">{slot.emoji}</span>
              <span className="font-semibold text-sm text-foreground">{slot.label}</span>
              <span className="text-[10px] text-muted-foreground">{slot.timeHint}</span>
              {slot.loggedCalories > 0 && (
                <span className="text-[10px] font-medium text-primary">{slot.loggedCalories} kcal</span>
              )}
            </motion.button>
          ))}
        </div>

        {/* PWA hint - only after 3+ visits */}
        {showPwaHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center text-[10px] text-muted-foreground/60 pt-2"
          >
            💡 Add this page to your home screen for instant access
          </motion.div>
        )}
      </div>

      {/* Logging sheet */}
      {sheetMeal && (
        <LoggingOptionsSheet
          open={!!sheetMeal}
          onClose={() => { setSheetMeal(null); refresh(); }}
          mealType={sheetMeal.type}
          mealLabel={sheetMeal.label}
        />
      )}
    </div>
  );
}
