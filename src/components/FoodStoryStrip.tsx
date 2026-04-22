import { useMemo } from 'react';
import { Camera } from 'lucide-react';
import { getAllLogDates, getDailyLog, MealEntry } from '@/lib/store';

interface Props {
  onOpenDate: (date: string) => void;
  refreshKey?: number;
}

interface MemoryItem {
  date: string;
  meal: MealEntry;
}

export default function FoodStoryStrip({ onOpenDate, refreshKey }: Props) {
  const memories = useMemo(() => {
    const dates = getAllLogDates().sort().reverse();
    const items: MemoryItem[] = [];

    for (const date of dates) {
      if (items.length >= 5) break;
      const log = getDailyLog(date);
      for (const meal of log.meals) {
        if (meal.photo && items.length < 5) {
          items.push({ date, meal });
        }
      }
    }
    return items;
  }, [refreshKey]);

  if (memories.length === 0) {
    return (
      <div className="card-elevated p-4 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <Camera className="w-5 h-5 text-primary" />
        </div>
        <p className="text-xs font-semibold text-foreground mb-0.5">No food memories yet 🍽️</p>
        <p className="text-[10px] text-muted-foreground">Start capturing your meals to build your food story.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-sm">📸</span>
        <h3 className="text-xs font-bold text-foreground">Your Food Story</h3>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {memories.map((m, i) => (
          <button
            key={`${m.date}-${m.meal.id}-${i}`}
            onClick={() => onOpenDate(m.date)}
            className="flex-shrink-0 group"
          >
            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-border group-hover:border-primary/30 transition-colors">
              <img
                src={m.meal.photo!}
                alt={m.meal.items.map(i => i.name).join(', ')}
                loading="lazy"
                decoding="async"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[9px] text-muted-foreground text-center mt-1 font-medium">
              {new Date(m.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
