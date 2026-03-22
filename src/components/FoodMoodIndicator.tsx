interface Props {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export default function FoodMoodIndicator({ protein, carbs, fat, calories }: Props) {
  const total = protein + carbs + fat;
  if (total === 0) return null;

  const proteinRatio = protein / total;
  const carbRatio = carbs / total;

  let emoji = '😊'; // balanced
  let label = 'Balanced';

  if (proteinRatio > 0.35) { emoji = '💪'; label = 'High Protein'; }
  else if (carbRatio > 0.55) { emoji = '😴'; label = 'High Carb'; }
  else if (calories < 300) { emoji = '🥗'; label = 'Light'; }
  else if (calories > 700) { emoji = '🍔'; label = 'Indulgence'; }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-foreground/10 text-[10px] font-medium text-primary-foreground/70">
      {emoji} {label}
    </span>
  );
}
