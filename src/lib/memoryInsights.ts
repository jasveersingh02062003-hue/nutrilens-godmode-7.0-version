import { DailyLog, getDailyTotals, UserProfile, MealEntry } from './store';

export function generateDayBlockInsight(log: DailyLog, profile: UserProfile | null): string | null {
  const totals = getDailyTotals(log);
  if (totals.eaten === 0) return null;
  const goal = profile?.dailyCalories || 2000;
  const proteinGoal = profile?.dailyProtein || 60;

  if (totals.protein < proteinGoal * 0.7) return '💪 Low protein day';
  if (totals.eaten > goal * 1.3) return '🔥 High calorie day';
  const allRestaurant = log.meals.length > 0 && log.meals.every(m => m.source?.category === 'restaurant' || m.source?.category === 'fast_food');
  if (allRestaurant) return '🍽️ Ate out all day';
  if (totals.eaten >= goal * 0.9 && totals.eaten <= goal * 1.1 && totals.protein >= proteinGoal * 0.9) return '✅ Great balance!';
  return null;
}

interface ScrollInsight {
  emoji: string;
  text: string;
}

export function generateScrollStopperInsights(logs: DailyLog[]): ScrollInsight[] {
  const insights: ScrollInsight[] = [];

  // Most frequent food
  const foodCounts: Record<string, number> = {};
  const dayOfWeekCounts: Record<number, number> = {};

  for (const log of logs) {
    for (const meal of log.meals) {
      if (meal.source?.category === 'restaurant' || meal.source?.category === 'fast_food') {
        const dow = new Date(log.date + 'T12:00:00').getDay();
        dayOfWeekCounts[dow] = (dayOfWeekCounts[dow] || 0) + 1;
      }
      for (const item of meal.items) {
        const name = item.name.toLowerCase().trim();
        foodCounts[name] = (foodCounts[name] || 0) + 1;
      }
    }
  }

  // Repeat foods
  const topFood = Object.entries(foodCounts).sort((a, b) => b[1] - a[1])[0];
  if (topFood && topFood[1] >= 3) {
    insights.push({ emoji: '🍛', text: `You had ${topFood[0]} ${topFood[1]} times this month.` });
  }

  // Day of week pattern
  const dayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const topDay = Object.entries(dayOfWeekCounts).sort((a, b) => b[1] - a[1])[0];
  if (topDay && Number(topDay[1]) >= 2) {
    insights.push({ emoji: '📊', text: `You eat out most on ${dayNames[Number(topDay[0])]}.` });
  }

  // Clean streaks (days under calorie goal)
  let streak = 0, maxStreak = 0;
  for (const log of logs) {
    const totals = getDailyTotals(log);
    if (totals.eaten > 0 && totals.eaten <= 2200) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
    }
  }
  if (maxStreak >= 3) {
    insights.push({ emoji: '🔥', text: `${maxStreak}-day clean streak this month!` });
  }

  return insights;
}
