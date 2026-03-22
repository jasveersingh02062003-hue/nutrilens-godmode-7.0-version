import { useState, useMemo } from 'react';
import { X, ThumbsUp, ThumbsDown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getWeather } from '@/lib/weather-service';
import { getTodayDateKey, isDailyHidden, setDailyHidden } from '@/lib/daily-visibility';
import { shouldShowNudge } from '@/lib/behavior-stats';
import {
  getDashboardWeatherNudge,
  getMealWeatherNudge,
  saveNudgeFeedback,
  type WeatherNudge,
} from '@/lib/weather-nudge-service';
import type { FoodItem } from '@/lib/store';
import { isPremium } from '@/lib/subscription-service';

interface Props {
  /** If provided, generates meal-specific nudge; otherwise dashboard nudge */
  mealItems?: FoodItem[];
  /** Called when user taps a suggested food to add */
  onAddFood?: (food: { name: string; emoji: string; calories: number }) => void;
  /** Compact mode for camera flow */
  compact?: boolean;
}

export default function WeatherNudgeCard({ mealItems, onAddFood, compact }: Props) {
  const todayKey = getTodayDateKey();
  const isDashboardCard = !mealItems;
  const [dismissed, setDismissed] = useState(() =>
    isDashboardCard
      ? (isDailyHidden('nutrilens_dashboard_weather_nudge_hidden', todayKey) || !shouldShowNudge('weather'))
      : false
  );
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);

  const weather = useMemo(() => getWeather(), []);
  const nudge = useMemo<WeatherNudge | null>(() => {
    if (mealItems) return getMealWeatherNudge(mealItems);
    return getDashboardWeatherNudge();
  }, [mealItems]);

  if (!nudge || dismissed || !isPremium()) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (isDashboardCard) {
      setDailyHidden('nutrilens_dashboard_weather_nudge_hidden', todayKey);
    }
  };

  const handleVote = (vote: 'up' | 'down') => {
    setVoted(vote);
    saveNudgeFeedback(nudge.id, vote);
    if (vote === 'down') {
      setTimeout(() => handleDismiss(), 600);
    }
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`relative rounded-2xl border border-primary/15 bg-primary/5 overflow-hidden ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}
        >
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-background/60 flex items-center justify-center"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>

          {/* Weather chip */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-sm">{weather.icon}</span>
            <span className="text-[10px] font-semibold text-primary">
              {weather.temperature}°C · {weather.description}
            </span>
          </div>

          {/* Nudge message */}
          <p className={`font-medium text-foreground pr-6 ${compact ? 'text-[11px]' : 'text-xs'}`}>
            {nudge.icon} {nudge.message}
          </p>

          {/* Suggested foods */}
          {nudge.suggestedFoods && nudge.suggestedFoods.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {nudge.suggestedFoods.map((food) => (
                <button
                  key={food.name}
                  onClick={() => onAddFood?.(food)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background/70 border border-border text-[10px] font-semibold text-foreground hover:bg-primary/10 hover:border-primary/20 active:scale-[0.97] transition-all"
                >
                  <span>{food.emoji}</span>
                  <span>{food.name}</span>
                  {onAddFood && <Plus className="w-2.5 h-2.5 text-primary" />}
                </button>
              ))}
            </div>
          )}

          {/* Feedback buttons */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => handleVote('up')}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                voted === 'up' ? 'bg-primary/20 text-primary' : 'bg-background/50 text-muted-foreground hover:bg-primary/10'
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleVote('down')}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                voted === 'down' ? 'bg-accent/20 text-accent' : 'bg-background/50 text-muted-foreground hover:bg-accent/10'
              }`}
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
            {voted && (
              <span className="text-[9px] text-muted-foreground">
                {voted === 'up' ? 'Thanks! We\'ll show more like this.' : 'Got it, showing less of these.'}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
