import { Droplets, Plus } from 'lucide-react';
import { getWeather } from '@/lib/weather-service';
import { getWeatherWaterBonus } from '@/lib/food-tags';
import { getActivePlan } from '@/lib/event-plan-service';
import { getProfile } from '@/lib/store';
import { useMemo } from 'react';

interface Props {
  cups: number;
  goal: number;
  onAdd: () => void;
}

export default function WaterTrackerCompact({ cups, goal, onAdd }: Props) {
  const weather = useMemo(() => getWeather(), []);
  const weatherBonus = useMemo(() => getWeatherWaterBonus(weather.temperature, weather.season), [weather]);
  const activePlan = getActivePlan();
  const profile = getProfile();

  // Madhavan override: weightKg × 40ml, clamped 3000-5000ml
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
    <div className="card-subtle p-3 flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-secondary" />
          </div>
          <p className="font-semibold text-xs text-foreground">Hydration</p>
        </div>
        <button
          onClick={onAdd}
          className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary hover:bg-secondary/20 transition-colors active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground mb-1.5">{cups * 250}ml / {adjustedGoal}ml</p>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-secondary transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground">{cups}/{goalCups}</span>
      </div>
      {weatherBonus.extraCups > 0 && !madhavanLabel && (
        <p className="text-[9px] text-secondary font-medium mt-1">{weatherBonus.nudge}</p>
      )}
      {madhavanLabel && (
        <p className="text-[9px] text-primary font-medium mt-1">🧘 {madhavanLabel}</p>
      )}
    </div>
  );
}
