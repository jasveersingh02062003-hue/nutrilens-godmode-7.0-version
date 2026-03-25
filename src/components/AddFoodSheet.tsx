import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import { searchIndianFoods, indianFoodToFoodItem } from '@/lib/indian-foods';
import { estimateCost } from '@/lib/price-database';
import type { FoodItem } from '@/lib/store';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: FoodItem) => void;
}

export default function AddFoodSheet({ open, onOpenChange, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const results = query.trim().length >= 2 ? searchIndianFoods(query) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[70vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-center text-base">Add Missing Item</SheetTitle>
        </SheetHeader>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search foods (e.g. roti, dal, rice)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto mt-3 space-y-1">
          {results.length === 0 && query.trim().length >= 2 && (
            <p className="text-center text-muted-foreground text-sm py-8">No results found</p>
          )}
          {results.map(food => {
            const item = indianFoodToFoodItem(food);
            // Auto-estimate cost for PES display
            const cost = estimateCost([{ name: food.name, quantity: 1, unit: food.servingUnit }]);
            return (
              <button
                key={food.id}
                onClick={() => {
                  onAdd({
                    ...item,
                    id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
                    itemCost: cost || 0,
                  });
                  setQuery('');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 active:scale-[0.98] transition-all"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{food.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {food.hindi} · {food.defaultServing}{food.servingUnit} · {item.calories} kcal
                    {cost ? ` · ₹${cost}` : ''}
                  </p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
