import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Leaf, Plus } from 'lucide-react';
import { getWeather } from '@/lib/weather-service';
import { getSeasonalPicks, type SeasonalPick } from '@/lib/food-tags';

interface Props {
  onAddFood?: (pick: SeasonalPick) => void;
}

export default function SeasonalPicksRow({ onAddFood }: Props) {
  const weather = useMemo(() => getWeather(), []);
  const picks = useMemo(() => getSeasonalPicks(weather.season, weather.temperature), [weather]);

  if (picks.length === 0) return null;

  const seasonLabel = weather.season.charAt(0).toUpperCase() + weather.season.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
          <Leaf className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="text-xs font-bold text-foreground">{seasonLabel} Picks</h3>
        <span className="text-[10px] text-muted-foreground">
          {weather.icon} {weather.temperature}°C
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {picks.map((pick, i) => (
          <motion.button
            key={pick.name}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            onClick={() => onAddFood?.(pick)}
            className="flex-shrink-0 w-28 card-subtle p-2.5 text-left hover:shadow-md active:scale-[0.97] transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">{pick.emoji}</span>
              {onAddFood && (
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-3 h-3 text-primary" />
                </div>
              )}
            </div>
            <p className="text-[11px] font-semibold text-foreground mt-1.5 leading-tight truncate">{pick.name}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">{pick.reason}</p>
            <p className="text-[9px] font-semibold text-primary mt-1">{pick.calories} kcal</p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
