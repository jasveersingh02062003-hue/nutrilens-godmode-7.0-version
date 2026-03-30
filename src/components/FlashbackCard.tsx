import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { getDailyLog, getDailyTotals } from '@/lib/store';

interface Props {
  onOpenDate: (date: string) => void;
}

const mealEmojis: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿',
};

interface FlashbackData {
  date: string;
  label: string;
  mealType: string;
  foodNames: string;
  photo: string | null;
  calories: number;
}

function getFlashbackMessage(type: string): string {
  const messages: Record<string, string> = {
    'week': 'You ate this 1 week ago',
    'two_weeks': 'You ate this 2 weeks ago',
    'month': 'You ate this 1 month ago',
    'highest_cal': 'Your highest calorie day recently',
    'best_protein': 'Your best protein day recently',
  };
  return messages[type] || 'You ate this before';
}

export default function FlashbackCard({ onOpenDate }: Props) {
  const flashback = useMemo<FlashbackData | null>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Rotate flashback types based on day
    const strategies: Array<() => FlashbackData | null> = [
      // Standard time-based
      () => {
        const offsets = [7, 14, 30];
        for (const offset of offsets) {
          const d = new Date(today);
          d.setDate(d.getDate() - offset);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const log = getDailyLog(dateStr);
          if (log.meals.length > 0) {
            const mealWithPhoto = log.meals.find(m => m.photo);
            const meal = mealWithPhoto || log.meals[0];
            const label = offset === 7 ? 'week' : offset === 14 ? 'two_weeks' : 'month';
            return {
              date: dateStr,
              label: getFlashbackMessage(label),
              mealType: meal.type,
              foodNames: meal.items.map(i => i.name).join(', '),
              photo: meal.photo || null,
              calories: meal.totalCalories,
            };
          }
        }
        return null;
      },
      // Highest calorie day in last 14 days
      () => {
        let best: FlashbackData | null = null;
        let maxCal = 0;
        for (let i = 2; i <= 14; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const log = getDailyLog(dateStr);
          const totals = getDailyTotals(log);
          if (totals.eaten > maxCal && log.meals.length > 0) {
            maxCal = totals.eaten;
            const meal = log.meals.find(m => m.photo) || log.meals[0];
            best = {
              date: dateStr,
              label: getFlashbackMessage('highest_cal'),
              mealType: meal.type,
              foodNames: meal.items.map(i => i.name).join(', '),
              photo: meal.photo || null,
              calories: totals.eaten,
            };
          }
        }
        return best;
      },
      // Best protein day
      () => {
        let best: FlashbackData | null = null;
        let maxProt = 0;
        for (let i = 2; i <= 14; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const log = getDailyLog(dateStr);
          const totals = getDailyTotals(log);
          if (totals.protein > maxProt && log.meals.length > 0) {
            maxProt = totals.protein;
            const meal = log.meals.find(m => m.photo) || log.meals[0];
            best = {
              date: dateStr,
              label: getFlashbackMessage('best_protein'),
              mealType: meal.type,
              foodNames: meal.items.map(i => i.name).join(', '),
              photo: meal.photo || null,
              calories: totals.eaten,
            };
          }
        }
        return best;
      },
    ];

    // Rotate strategy based on day of week
    const strategyIndex = dayOfWeek % strategies.length;
    const result = strategies[strategyIndex]();
    if (result) return result;
    
    // Fallback: try all strategies
    for (const strategy of strategies) {
      const r = strategy();
      if (r) return r;
    }
    return null;
  }, []);

  if (!flashback) return null;

  return (
    <button
      onClick={() => onOpenDate(flashback.date)}
      className="w-full card-elevated p-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
    >
      {flashback.photo ? (
        <img
          src={flashback.photo}
          alt="Flashback meal"
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">{mealEmojis[flashback.mealType] || '🍽️'}</span>
        </div>
      )}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Clock className="w-3 h-3 text-accent" />
          <span className="text-[10px] font-bold text-accent">{flashback.label}</span>
        </div>
        <p className="text-xs font-semibold text-foreground truncate">{flashback.foodNames}</p>
        <p className="text-[10px] text-muted-foreground">
          {mealEmojis[flashback.mealType]} {flashback.mealType} · {flashback.calories} kcal
        </p>
      </div>
      <span className="text-muted-foreground text-xs">›</span>
    </button>
  );
}
