import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { UtensilsCrossed, X, Check } from 'lucide-react';
import { getProfile, toLocalDateKey, getDailyLog } from '@/lib/store';
import { isGymDay } from '@/lib/gym-service';
import { getPostWorkoutSuggestion } from '@/lib/gym-meal-engine';
import { useNavigate } from 'react-router-dom';

export default function PostWorkoutCard() {
  const profile = getProfile();
  const today = toLocalDateKey(new Date());
  const log = getDailyLog(today);
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const suggestion = useMemo(() => getPostWorkoutSuggestion(profile), [profile]);

  if (!profile?.gym?.goer || !isGymDay(profile, today) || dismissed) return null;
  if (!log.gym?.attended) return null; // only show after gym check-in "Yes"
  if (!suggestion) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated p-4 space-y-3 border-l-4 border-l-green-500"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Recovery Meal 🍽️</p>
            <p className="text-[10px] text-muted-foreground">Great workout! Refuel for recovery · {suggestion.timing}</p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-green-500/5 border border-green-500/15 rounded-xl px-4 py-3">
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
        onClick={() => { setDismissed(true); navigate('/log'); }}
        className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold flex items-center justify-center gap-2"
      >
        <Check className="w-4 h-4" /> Log This Meal
      </button>
    </motion.div>
  );
}
