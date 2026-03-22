import { useState, useMemo, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchIndianFoods, type IndianFood } from '@/lib/indian-foods';
import { getUnitOptionsForFood, calculateNutrition, type UnitOption } from '@/lib/unit-conversion';

interface FoodReplaceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalName: string;
  originalQuantity: number;
  originalUnit: string;
  onReplace: (food: IndianFood, unitOptions: UnitOption[]) => void;
}

export default function FoodReplaceSheet({
  open,
  onOpenChange,
  originalName,
  originalQuantity,
  originalUnit,
  onReplace,
}: FoodReplaceSheetProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) {
      // Show foods from same rough category as original name
      return searchIndianFoods(originalName).slice(0, 15);
    }
    return searchIndianFoods(q).slice(0, 20);
  }, [query, originalName]);

  const handleSelect = useCallback((food: IndianFood) => {
    const unitOptions = getUnitOptionsForFood(food.id, food.category, food.defaultServing, food.servingUnit);
    onReplace(food, unitOptions);
    onOpenChange(false);
    setQuery('');
  }, [onReplace, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setQuery(''); }}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[75vh]">
        <SheetHeader>
          <SheetTitle className="text-center text-base">
            Replace "{originalName}"
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 space-y-3 flex flex-col h-[calc(100%-3rem)]">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for correct food..."
              autoFocus
              className="w-full pl-9 pr-4 py-3 rounded-2xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Keeping info */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
            <span className="text-[11px] text-muted-foreground">
              Quantity will be preserved: <span className="font-semibold text-foreground">{originalQuantity} {originalUnit}</span>
            </span>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-1 pb-4">
            <AnimatePresence mode="popLayout">
              {results.map((food, i) => {
                const per100g = { calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat, fiber: food.fiber };
                const unitOpts = getUnitOptionsForFood(food.id, food.category, food.defaultServing, food.servingUnit);
                // Try to calc with original unit, fallback to default serving
                const hasUnit = unitOpts.some(u => u.unit.toLowerCase() === originalUnit.toLowerCase());
                const useUnit = hasUnit ? originalUnit : food.servingUnit;
                const nutrition = calculateNutrition(per100g, originalQuantity, useUnit, unitOpts);

                return (
                  <motion.button
                    key={food.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => handleSelect(food)}
                    className="w-full px-3.5 py-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-all flex items-center gap-3 text-left active:scale-[0.98]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{food.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {nutrition.calories} kcal · P {nutrition.protein}g · C {nutrition.carbs}g · F {nutrition.fat}g
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {food.category} · {originalQuantity} {useUnit}{!hasUnit && useUnit !== originalUnit ? ` (was ${originalUnit})` : ''}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </motion.button>
                );
              })}
            </AnimatePresence>

            {results.length === 0 && (
              <div className="flex flex-col items-center pt-10 text-center">
                <Search className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No foods found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
