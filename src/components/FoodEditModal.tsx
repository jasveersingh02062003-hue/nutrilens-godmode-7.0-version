import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import UnitPicker from '@/components/UnitPicker';
import type { UnitOption } from '@/lib/unit-conversion';
import { calculateNutrition } from '@/lib/unit-conversion';
import type { MealSourceCategory } from '@/lib/store';

interface FoodItemData {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  per100g: { calories: number; protein: number; carbs: number; fat: number; fiber?: number };
  unitOptions: UnitOption[];
  itemCost?: number;
  itemSource?: MealSourceCategory;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FoodItemData;
  onSave: (updates: { quantity: number; unit: string; itemCost?: number; itemSource?: MealSourceCategory }) => void;
}

const SOURCE_OPTIONS: { value: MealSourceCategory; label: string; emoji: string }[] = [
  { value: 'home', label: 'Home', emoji: '🏠' },
  { value: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { value: 'street_food', label: 'Street Food', emoji: '🛒' },
];

export default function FoodEditModal({ open, onOpenChange, item, onSave }: Props) {
  const [qty, setQty] = useState(item.quantity);
  const [unit, setUnit] = useState(item.unit);
  const [cost, setCost] = useState(item.itemCost?.toString() || '');
  const [source, setSource] = useState<MealSourceCategory | undefined>(item.itemSource);

  const nutrition = calculateNutrition(item.per100g, qty, unit, item.unitOptions);

  const handleSave = () => {
    onSave({
      quantity: qty,
      unit,
      itemCost: cost ? parseFloat(cost) : undefined,
      itemSource: source,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="text-center text-base">Edit {item.name}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4 pb-4">
          {/* Quantity & Unit */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantity</label>
            <div className="mt-2">
              <UnitPicker
                quantity={qty}
                unit={unit}
                unitOptions={item.unitOptions}
                per100g={item.per100g}
                onQuantityChange={setQty}
                onUnitChange={setUnit}
              />
            </div>
          </div>

          {/* Live nutrition preview */}
          <div className="card-subtle p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Nutrition ({nutrition.totalGrams}g)</span>
              <span className="text-sm font-bold text-foreground">{nutrition.calories} kcal</span>
            </div>
            <div className="flex gap-3 text-[11px] text-muted-foreground mt-1">
              <span>P {nutrition.protein}g</span>
              <span>C {nutrition.carbs}g</span>
              <span>F {nutrition.fat}g</span>
            </div>
          </div>

          {/* Variant / Source */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Variant</label>
            <div className="flex gap-2 mt-2">
              {SOURCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSource(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-center transition-all active:scale-95 ${
                    source === opt.value ? 'border-primary bg-primary/10' : 'border-border bg-card'
                  }`}
                >
                  <span className="text-sm">{opt.emoji}</span>
                  <p className="text-[10px] font-semibold text-foreground mt-0.5">{opt.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Cost */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cost (optional)</label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
              <Input
                type="number"
                value={cost}
                onChange={e => setCost(e.target.value)}
                placeholder="0"
                className="pl-7"
              />
            </div>
          </div>

          {/* Save */}
          <button onClick={handleSave} className="btn-primary w-full py-3">
            Save Changes
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
