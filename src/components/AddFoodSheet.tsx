import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Search, Plus, AlertTriangle } from 'lucide-react';
import { searchIndianFoods, indianFoodToFoodItem } from '@/lib/indian-foods';
import { estimateCost } from '@/lib/price-database';
import { checkAllergens, getAllergenLabel, getAllergenEmoji } from '@/lib/allergen-engine';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { FoodItem } from '@/lib/store';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: FoodItem) => void;
}

export default function AddFoodSheet({ open, onOpenChange, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const { profile } = useUserProfile();
  const userAllergens = profile?.allergens || [];
  const results = query.trim().length >= 2 ? searchIndianFoods(query) : [];
  const [pendingItem, setPendingItem] = useState<{ food: any; item: FoodItem; matched: string[] } | null>(null);

  const handleAdd = (food: any) => {
    const item = indianFoodToFoodItem(food);
    const cost = estimateCost([{ name: food.name, quantity: 1, unit: food.servingUnit }]);
    const finalItem: FoodItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
      itemCost: cost || 0,
      confidenceScore: 0.9,
    };

    const allergenCheck = checkAllergens(food.name, userAllergens);
    if (allergenCheck.hasConflict) {
      setPendingItem({ food, item: finalItem, matched: allergenCheck.matched });
      return;
    }

    onAdd(finalItem);
    setQuery('');
  };

  const confirmAdd = () => {
    if (pendingItem) {
      onAdd(pendingItem.item);
      setPendingItem(null);
      setQuery('');
    }
  };

  return (
    <>
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
            <AnimatePresence>
              {results.map((food, idx) => {
                const item = indianFoodToFoodItem(food);
                const cost = estimateCost([{ name: food.name, quantity: 1, unit: food.servingUnit }]);
                const allergenCheck = checkAllergens(food.name, userAllergens);

                return (
                  <motion.button
                    key={food.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => handleAdd(food)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 active:scale-[0.98] transition-all"
                  >
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground">{food.name}</p>
                        {allergenCheck.hasConflict && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-0.5"
                          >
                            {allergenCheck.matched.map(a => (
                              <span
                                key={a}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-destructive/10 border border-destructive/20 text-[9px] font-bold text-destructive animate-pulse"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {getAllergenLabel(a)}
                              </span>
                            ))}
                          </motion.div>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {food.hindi} · {food.defaultServing}{food.servingUnit} · {item.calories} kcal
                        {cost ? ` · ₹${cost}` : ''}
                      </p>
                    </div>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      allergenCheck.hasConflict ? 'bg-destructive/10' : 'bg-primary/10'
                    }`}>
                      <Plus className={`w-4 h-4 ${allergenCheck.hasConflict ? 'text-destructive' : 'text-primary'}`} />
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </SheetContent>
      </Sheet>

      {/* Allergen Confirmation Dialog */}
      <AlertDialog open={!!pendingItem} onOpenChange={v => { if (!v) setPendingItem(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-12 h-12 mx-auto mb-2 rounded-full bg-destructive/10 flex items-center justify-center"
            >
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </motion.div>
            <AlertDialogTitle className="text-center">⚠️ Allergen Warning</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <span className="font-semibold text-foreground">{pendingItem?.food.name}</span> contains{' '}
              <span className="font-bold text-destructive">
                {pendingItem?.matched.map(a => `${getAllergenEmoji(a)} ${getAllergenLabel(a)}`).join(', ')}
              </span>.
              <br />
              <span className="text-muted-foreground">Are you sure you want to log this?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={confirmAdd}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Log Anyway
            </AlertDialogAction>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
