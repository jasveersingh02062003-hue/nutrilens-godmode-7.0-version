import { DailyLog, getDailyTotals, UserProfile, getDailyLog } from './store';

type InsightType = 'observational' | 'comparative' | 'actionable';

interface Insight {
  text: string;
  type: InsightType;
}

function getYesterdayKey(date: string): string {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function generateDayInsight(log: DailyLog, profile: UserProfile | null): string | null {
  if (!log.meals.length) return null;

  const totals = getDailyTotals(log);
  const goal = profile?.dailyCalories || 2000;
  const insights: Insight[] = [];

  // Source analysis
  const restaurantCount = log.meals.filter(m => m.source?.category === 'restaurant' || m.source?.category === 'fast_food').length;
  const streetFoodCount = log.meals.filter(m => m.source?.category === 'street_food').length;
  const homeCount = log.meals.filter(m => m.source?.category === 'home').length;

  // Observational
  if (restaurantCount >= 2) {
    insights.push({ text: `You ate out ${restaurantCount} times today. Oil and sodium intake is likely elevated.`, type: 'observational' });
  }
  if (streetFoodCount >= 2) {
    insights.push({ text: `${streetFoodCount} street food meals today. That's a lot of outside food in one day.`, type: 'observational' });
  }
  if (homeCount === log.meals.length && homeCount >= 2) {
    insights.push({ text: 'All home-cooked today — great control over ingredients! 🏠', type: 'observational' });
  }

  // Comparative — compare to yesterday
  const yesterdayKey = getYesterdayKey(log.date);
  const yesterdayLog = getDailyLog(yesterdayKey);
  const yesterdayTotals = getDailyTotals(yesterdayLog);
  
  if (yesterdayTotals.eaten > 0 && totals.eaten > 0) {
    const carbDiff = totals.carbs - yesterdayTotals.carbs;
    const proteinDiff = totals.protein - yesterdayTotals.protein;
    
    if (Math.abs(carbDiff) > 30) {
      insights.push({ 
        text: carbDiff > 0 
          ? `${Math.round(carbDiff)}g more carbs than yesterday.`
          : `${Math.round(Math.abs(carbDiff))}g fewer carbs than yesterday. Nice control!`,
        type: 'comparative' 
      });
    }
    if (proteinDiff > 15) {
      insights.push({ text: `${Math.round(proteinDiff)}g more protein than yesterday. Good progress! 💪`, type: 'comparative' });
    }
  }

  // Cooking method analysis
  const friedCount = log.meals.filter(m => m.cookingMethod === 'fried').length;
  if (friedCount >= 2) {
    insights.push({ text: 'Multiple fried meals today. Try air-frying or grilling to cut ~120 kcal per meal.', type: 'actionable' });
  }

  // Calorie analysis
  if (totals.eaten > 0) {
    const ratio = totals.eaten / goal;
    if (ratio > 1.3) {
      insights.push({ text: `You went ${Math.round((ratio - 1) * 100)}% over your calorie goal. Consider lighter meals tomorrow.`, type: 'actionable' });
    } else if (ratio >= 0.9 && ratio <= 1.1) {
      insights.push({ text: 'Great calorie balance today! Right on target. 🎯', type: 'observational' });
    } else if (ratio < 0.6 && totals.eaten > 0) {
      insights.push({ text: 'You ate significantly under your goal. Make sure you\'re getting enough nutrition.', type: 'actionable' });
    }
  }

  // Protein check
  const proteinGoal = profile?.dailyProtein || 60;
  if (totals.protein >= proteinGoal * 0.9) {
    insights.push({ text: 'Excellent protein intake today! Your muscles will thank you. 💪', type: 'observational' });
  } else if (totals.protein < proteinGoal * 0.5 && totals.eaten > 500) {
    insights.push({ text: 'Protein is low today. Add eggs, dal, or chicken to your next meal.', type: 'actionable' });
  }

  // Water
  const waterGoal = profile?.waterGoal || 8;
  if (log.waterCups >= waterGoal) {
    insights.push({ text: 'Hydration on point! 💧', type: 'observational' });
  } else if (log.waterCups < waterGoal * 0.5 && log.waterCups > 0) {
    insights.push({ text: 'Water intake is low. Try to drink more throughout the day.', type: 'actionable' });
  }

  if (insights.length === 0) {
    return 'Keep tracking consistently — Monica is watching your patterns! 📊';
  }

  // Rotate types based on day of week to avoid always showing the same type
  const dayOfWeek = new Date(log.date + 'T12:00:00').getDay();
  const preferredType: InsightType = dayOfWeek % 3 === 0 ? 'observational' : dayOfWeek % 3 === 1 ? 'comparative' : 'actionable';
  
  // Try preferred type first, then fallback
  const preferred = insights.find(i => i.type === preferredType);
  return preferred ? preferred.text : insights[0].text;
}
