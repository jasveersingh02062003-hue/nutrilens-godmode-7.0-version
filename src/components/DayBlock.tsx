import { DailyLog, getDailyTotals, getProfile, MealEntry, MealSourceCategory } from '@/lib/store';
import { generateDayBlockInsight } from '@/lib/memoryInsights';
import { getSourceEmoji } from '@/lib/context-learning';

interface Props {
  log: DailyLog;
  onOpenDate: (date: string) => void;
  onOpenMemory: (date: string, mealId: string) => void;
}

export default function DayBlock({ log, onOpenDate, onOpenMemory }: Props) {
  const profile = getProfile();
  const totals = getDailyTotals(log);
  const mealsWithPhotos = log.meals.filter(m => m.photo);
  const showPhotos = mealsWithPhotos.slice(0, 3);
  const extraCount = mealsWithPhotos.length - 3;

  const foodNames = log.meals
    .flatMap(m => m.items.map(i => i.name))
    .slice(0, 4)
    .join(', ');

  // Source breakdown
  const sourceCounts: Record<string, number> = {};
  for (const meal of log.meals) {
    const cat = meal.source?.category || 'home';
    sourceCounts[cat] = (sourceCounts[cat] || 0) + 1;
  }

  const insight = generateDayBlockInsight(log, profile);

  const formattedDate = new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  if (mealsWithPhotos.length === 0) return null;

  return (
    <button
      onClick={() => onOpenDate(log.date)}
      className="w-full text-left card-elevated p-3 space-y-2 active:scale-[0.99] transition-transform"
    >
      <p className="text-xs font-bold text-foreground">{formattedDate}</p>

      {/* Thumbnails */}
      <div className="flex gap-1.5">
        {showPhotos.map((meal) => (
          <div
            key={meal.id}
            onClick={(e) => { e.stopPropagation(); onOpenMemory(log.date, meal.id); }}
            className="w-20 h-20 rounded-xl overflow-hidden border border-border flex-shrink-0"
          >
            <img src={meal.photo!} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
        {extraCount > 0 && (
          <div className="w-20 h-20 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-muted-foreground">+{extraCount}</span>
          </div>
        )}
      </div>

      {/* Food names */}
      {foodNames && (
        <p className="text-[11px] text-muted-foreground truncate">🍛 {foodNames}</p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
        <span>🔥 {Math.round(totals.eaten)} kcal</span>
        <span>💪 {Math.round(totals.protein)}g protein</span>
      </div>

      {/* Source breakdown */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        {Object.entries(sourceCounts).map(([cat, count]) => (
          <span key={cat}>{getSourceEmoji(cat as MealSourceCategory)} {count}</span>
        ))}
      </div>

      {/* Insight */}
      {insight && (
        <p className="text-[10px] font-medium text-primary/80 bg-primary/5 rounded-lg px-2 py-1 inline-block">
          {insight}
        </p>
      )}
    </button>
  );
}
