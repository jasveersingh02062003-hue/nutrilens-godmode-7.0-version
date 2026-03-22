import { Minus, Plus, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { UnitOption } from '@/lib/unit-conversion';
import { calculateNutrition } from '@/lib/unit-conversion';

interface Props {
  quantity: number;
  unit: string;
  unitOptions: UnitOption[];
  per100g: { calories: number; protein: number; carbs: number; fat: number; fiber?: number };
  onQuantityChange: (qty: number) => void;
  onUnitChange: (unit: string) => void;
  showNutrition?: boolean;
  compact?: boolean;
}

export default function UnitPicker({
  quantity, unit, unitOptions, per100g,
  onQuantityChange, onUnitChange,
  showNutrition = true, compact = false,
}: Props) {
  const nutrition = calculateNutrition(per100g, quantity, unit, unitOptions);

  return (
    <div className={compact ? 'flex items-center gap-1.5' : 'space-y-1.5'}>
      <div className="flex items-center gap-1.5">
        {/* Stepper */}
        <button
          onClick={() => onQuantityChange(Math.max(0.5, +(quantity - 0.5).toFixed(1)))}
          className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center active:scale-90 transition-transform shrink-0"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-sm font-bold min-w-[2rem] text-center text-foreground">{quantity}</span>
        <button
          onClick={() => onQuantityChange(+(quantity + 0.5).toFixed(1))}
          className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center active:scale-90 transition-transform shrink-0"
        >
          <Plus className="w-3 h-3 text-primary" />
        </button>

        {/* Unit dropdown */}
        <Select value={unit} onValueChange={onUnitChange}>
          <SelectTrigger className="h-7 w-auto min-w-[5rem] px-2 text-xs font-medium border-border rounded-lg gap-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {unitOptions.map(opt => (
              <SelectItem key={opt.unit} value={opt.unit} className="text-xs">
                {opt.unit} {opt.description ? `(${opt.gramsPerUnit}g)` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Live nutrition preview */}
      {showNutrition && !compact && (
        <p className="text-[10px] text-muted-foreground">
          → {nutrition.totalGrams}g → {nutrition.calories} kcal · P{nutrition.protein}g · C{nutrition.carbs}g · F{nutrition.fat}g
        </p>
      )}
    </div>
  );
}
