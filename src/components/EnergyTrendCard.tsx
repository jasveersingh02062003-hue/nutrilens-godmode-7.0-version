import { useMemo } from 'react';
import { Battery, TrendingUp, Dumbbell } from 'lucide-react';
import { getRecentLogs, getProfile, getDailyLog, toLocalDateKey } from '@/lib/store';

interface EnergyTrendCardProps {
  refreshKey?: number;
}

export default function EnergyTrendCard({ refreshKey }: EnergyTrendCardProps) {
  const profile = getProfile();

  const data = useMemo(() => {
    const entries: { date: string; energy: number; gymDay: boolean }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = toLocalDateKey(d);
      const log = getDailyLog(key);
      if (log.energyLevel) {
        entries.push({
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          energy: log.energyLevel,
          gymDay: !!log.gym?.attended,
        });
      }
    }
    return entries;
  }, [refreshKey]);

  if (data.length < 3) return null;

  const avgEnergy = data.reduce((s, d) => s + d.energy, 0) / data.length;
  const gymDayEnergy = data.filter(d => d.gymDay);
  const restDayEnergy = data.filter(d => !d.gymDay);
  const avgGym = gymDayEnergy.length > 0 ? gymDayEnergy.reduce((s, d) => s + d.energy, 0) / gymDayEnergy.length : 0;
  const avgRest = restDayEnergy.length > 0 ? restDayEnergy.reduce((s, d) => s + d.energy, 0) / restDayEnergy.length : 0;

  const maxBars = Math.min(data.length, 14);
  const displayData = data.slice(-maxBars);

  let insight = '';
  if (avgGym > avgRest + 0.3) {
    insight = '⚡ Your energy is higher on workout days — keep it up!';
  } else if (avgRest > avgGym + 0.3) {
    insight = '💤 Energy dips on gym days — try a better pre-workout meal.';
  } else if (avgEnergy < 2.5) {
    insight = '😴 Energy has been low — check your sleep and nutrition.';
  } else {
    insight = `Average energy: ${avgEnergy.toFixed(1)}/5 over ${data.length} days`;
  }

  return (
    <div className="card-elevated p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Battery className="w-4 h-4 text-accent" />
        <h3 className="font-semibold text-sm text-foreground">Energy Trends</h3>
      </div>

      <div className="flex items-end gap-1 h-20">
        {displayData.map((d, i) => {
          const pct = (d.energy / 5) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className={`w-full rounded-sm transition-all ${d.gymDay ? 'bg-primary' : 'bg-primary/25'}`}
                style={{ height: `${pct}%` }}
              />
              {i % 3 === 0 && (
                <span className="text-[7px] text-muted-foreground">{d.date}</span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">{insight}</p>

      {gymDayEnergy.length > 0 && restDayEnergy.length > 0 && (
        <div className="flex gap-4 text-[10px]">
          <span className="flex items-center gap-1">
            <Dumbbell className="w-3 h-3 text-primary" /> Gym: {avgGym.toFixed(1)}/5
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary/25" /> Rest: {avgRest.toFixed(1)}/5
          </span>
        </div>
      )}
    </div>
  );
}
