import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getWidgetData, type MealSlot, type MealSlotData, getLastLogMode, setLastLogMode, trackQuickLogVisit, getQuickLogVisits } from '@/lib/widget-data';
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

type PromptType = 'duplicate' | 'edit';

interface MealPrompt {
  type: PromptType;
  slot: MealSlotData;
}

function navigateToMode(navigate: ReturnType<typeof useNavigate>, mode: string, mealType: string) {
  if (mode === 'camera') {
    navigate(`/?meal=${mealType}`);
  } else if (mode === 'voice') {
    navigate(`/log?meal=${mealType}&mode=voice`);
  } else if (mode === 'barcode') {
    navigate(`/log?meal=${mealType}&mode=barcode`);
  } else {
    navigate(`/log?meal=${mealType}`);
  }
}

export default function QuickLog() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(() => getWidgetData());
  const [sheetMeal, setSheetMeal] = useState<{ type: string; label: string } | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [mealPrompt, setMealPrompt] = useState<MealPrompt | null>(null);
  const prevDataRef = useRef(data);
  const visits = useRef(0);

  // Long press refs
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const refresh = useCallback(() => {
    const newData = getWidgetData();
    const prev = prevDataRef.current;

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

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('nutrilens:update', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('nutrilens:update', handler);
      window.removeEventListener('storage', handler);
    };
  }, [refresh]);

  useEffect(() => {
    visits.current = trackQuickLogVisit();
  }, []);

  // Deep link handling
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

  // Instant tap → navigate using last mode
  const handleInstantTap = (slot: MealSlotData) => {
    // Completed/late_completed meals → edit prompt
    if (slot.status === 'completed' || slot.status === 'late_completed') {
      setMealPrompt({ type: 'edit', slot });
      return;
    }

    // Duplicate guard: if already has calories, ask
    if (slot.loggedCalories > 0) {
      setMealPrompt({ type: 'duplicate', slot });
      return;
    }

    const mode = getLastLogMode();
    navigateToMode(navigate, mode, slot.type);
  };

  // Long press → open mode selector sheet
  const handleLongPressStart = (slot: MealSlotData) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      if (navigator.vibrate) navigator.vibrate(20);
      setSheetMeal({ type: slot.type, label: slot.label });
    }, 500);
  };

  const handleLongPressEnd = (slot: MealSlotData) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!longPressTriggered.current) {
      if (navigator.vibrate) navigator.vibrate(10);
      handleInstantTap(slot);
    }
  };

  const handleLongPressCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
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
            <div>
              <h1 className="text-lg font-bold text-foreground">QuickLog</h1>
              <p className="text-[10px] text-muted-foreground">Tap to log · Hold to change mode</p>
            </div>
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
              <p className="text-sm font-semibold text-primary">✅ {feedback.mealLabel} logged!</p>
              <p className="text-xs text-muted-foreground mt-1">
                +{feedback.calories} kcal · +{feedback.protein}g protein
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Duplicate / Edit prompt */}
        <AnimatePresence>
          {mealPrompt && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl bg-card border border-border p-4 space-y-3"
            >
              <p className="text-sm font-medium text-foreground text-center">
                {mealPrompt.type === 'edit'
                  ? `${mealPrompt.slot.label} already logged — what would you like to do?`
                  : `${mealPrompt.slot.label} has entries — log more or edit?`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const mode = getLastLogMode();
                    setMealPrompt(null);
                    navigateToMode(navigate, mode, mealPrompt.slot.type);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
                >
                  {mealPrompt.type === 'edit' ? 'Add More' : 'Log Again'}
                </button>
                <button
                  onClick={() => {
                    setMealPrompt(null);
                    navigate(`/log?meal=${mealPrompt.slot.type}&edit=true`);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-muted text-foreground text-sm font-semibold"
                >
                  Edit Meal
                </button>
                <button
                  onClick={() => setMealPrompt(null)}
                  className="py-2 px-3 rounded-xl text-muted-foreground text-sm"
                >
                  Cancel
                </button>
              </div>
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
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">🔥</span>
              </div>
              <div className="text-center">
                <motion.p key={data.remainingCalories} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-lg font-bold text-foreground">
                  {data.remainingCalories}
                </motion.p>
                <p className="text-[10px] text-muted-foreground">kcal left</p>
              </div>
            </div>

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
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">💪</span>
              </div>
              <div className="text-center">
                <motion.p key={data.remainingProtein} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-lg font-bold text-foreground">
                  {data.remainingProtein}g
                </motion.p>
                <p className="text-[10px] text-muted-foreground">protein left</p>
              </div>
            </div>
          </div>

          <p className="text-center text-sm font-medium text-muted-foreground">{data.message}</p>
        </motion.div>

        {/* Meal buttons — tap = instant, hold = mode selector */}
        <div className="grid grid-cols-2 gap-3">
          {data.meals.map((slot, i) => (
            <motion.button
              key={slot.type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onPointerDown={() => handleLongPressStart(slot)}
              onPointerUp={() => handleLongPressEnd(slot)}
              onPointerLeave={handleLongPressCancel}
              className={`relative p-4 rounded-2xl border-2 transition-all active:scale-[0.96] flex flex-col items-center gap-2 select-none ${STATUS_STYLES[slot.status]}`}
            >
              {slot.status === 'completed' && <span className="absolute top-2 right-2 text-xs">✅</span>}
              {slot.status === 'late_completed' && <span className="absolute top-2 right-2 text-[10px]">⏰✔</span>}
              {slot.status === 'current' && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />}
              <span className="text-2xl">{slot.emoji}</span>
              <span className="font-semibold text-sm text-foreground">{slot.label}</span>
              <span className="text-[10px] text-muted-foreground">{slot.timeHint}</span>
              {slot.loggedCalories > 0 && (
                <span className="text-[10px] font-medium text-primary">{slot.loggedCalories} kcal</span>
              )}
            </motion.button>
          ))}
        </div>

        {/* PWA hint */}
        {showPwaHint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-center text-[10px] text-muted-foreground/60 pt-2">
            💡 Add this page to your home screen for instant access
          </motion.div>
        )}
      </div>

      {/* Logging sheet (long press) */}
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
