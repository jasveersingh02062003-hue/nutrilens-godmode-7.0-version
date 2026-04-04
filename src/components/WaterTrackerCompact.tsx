import { Plus } from 'lucide-react';
import { getWeather } from '@/lib/weather-service';
import { getWeatherWaterBonus } from '@/lib/food-tags';
import { getActivePlan } from '@/lib/event-plan-service';
import { getProfile } from '@/lib/store';
import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';

interface Props {
  cups: number;
  goal: number;
  onAdd: () => void;
}

export default memo(function WaterTrackerCompact({ cups, goal, onAdd }: Props) {
  const weather = useMemo(() => getWeather(), []);
  const weatherBonus = useMemo(() => getWeatherWaterBonus(weather.temperature, weather.season), [weather]);
  const activePlan = getActivePlan();
  const profile = getProfile();

  let adjustedGoal = goal + weatherBonus.extraCups * 250;
  let madhavanLabel = '';
  if (activePlan?.planId === 'madhavan_21_day' && profile?.weightKg) {
    const multiplier = activePlan.customSettings?.waterMultiplier || 40;
    adjustedGoal = Math.min(5000, Math.max(3000, Math.round(profile.weightKg * multiplier)));
    madhavanLabel = 'Madhavan hydration target';
  }

  const goalCups = Math.round(adjustedGoal / 250);
  const pct = Math.min(100, (cups / goalCups) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="glass-card p-3 flex-1 min-w-0 relative overflow-hidden"
    >
      {/* Wave background */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none" style={{ height: `${pct}%`, transition: 'height 0.6s ease-out' }}>
        <svg viewBox="0 0 400 20" preserveAspectRatio="none" className="absolute top-0 left-0 w-[200%] h-5 animate-wave" style={{ opacity: 0.15 }}>
          <path d="M0 10 Q50 0 100 10 Q150 20 200 10 Q250 0 300 10 Q350 20 400 10 V20 H0Z" fill="hsl(var(--secondary))" />
        </svg>
        <div className="absolute inset-0 bg-secondary/8" />
      </div>

      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
            <span className="text-base">💧</span>
          </div>
          <p className="font-semibold text-xs text-foreground">Hydration</p>
        </div>
        <motion.button
          onClick={onAdd}
          whileTap={{ scale: 0.85 }}
          className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary hover:bg-secondary/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </motion.button>
      </div>
      <p className="text-[11px] text-muted-foreground mb-1.5 relative z-10">{cups * 250}ml / {adjustedGoal}ml</p>
      <div className="flex items-center gap-1.5 relative z-10">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-secondary"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground">{cups}/{goalCups}</span>
      </div>
      {weatherBonus.extraCups > 0 && !madhavanLabel && (
        <p className="text-[9px] text-secondary font-medium mt-1 relative z-10">{weatherBonus.nudge}</p>
      )}
      {madhavanLabel && (
        <p className="text-[9px] text-primary font-medium mt-1 relative z-10">🧘 {madhavanLabel}</p>
      )}
    </motion.div>
  );
});
