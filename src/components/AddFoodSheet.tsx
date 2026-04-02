import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Search, Plus, AlertTriangle, ShieldAlert, Scale } from 'lucide-react';
import { searchIndianFoods, indianFoodToFoodItem } from '@/lib/indian-foods';
import { estimateCost } from '@/lib/price-database';
import { checkAllergens, getAllergenLabel, getAllergenEmoji, hasSevereAllergen } from '@/lib/allergen-engine';
import { checkFoodForConditions, getUserConditions } from '@/lib/condition-coach';
import { detectSugar, isSugarDetectionActive } from '@/lib/sugar-detector';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { motion, AnimatePresence } from 'framer-motion';
import ComparisonSheet from '@/components/ComparisonSheet';
import { buildFromFoodItem } from '@/lib/compare-helpers';
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
  const userConditions = getUserConditions(profile as any);
  const results = query.trim().length >= 2 ? searchIndianFoods(query) : [];
  const [pendingItem, setPendingItem] = useState<{ food: any; item: FoodItem; matched: string[] } | null>(null);
  const [showSevereConfirm, setShowSevereConfirm] = useState(false);
  const [severeButtonEnabled, setSevereButtonEnabled] = useState(false);
  const [compareSelection, setCompareSelection] = useState<any[]>([]);
  const [compareSheetOpen, setCompareSheetOpen] = useState(false);

  // Delayed enable for severe allergy confirmation button
  useEffect(() => {
    if (showSevereConfirm) {
      setSevereButtonEnabled(false);
      const timer = setTimeout(() => setSevereButtonEnabled(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSevereConfirm]);

  const handleAdd = (food: any) => {
    const item = indianFoodToFoodItem(food);
    const cost = estimateCost([{ name: food.name, quantity: 1, unit: food.servingUnit }]);
    const finalItem: FoodItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
      itemCost: cost || 0,
      confidenceScore: 0.9,
    };

    const allergenCheck = checkAllergens(food.name, userAllergens, food.allergens);
    if (allergenCheck.hasConflict) {
      setPendingItem({ food, item: finalItem, matched: allergenCheck.matched });
      return;
    }

    // Sugar Cut plan warning
    if (isSugarDetectionActive()) {
      const sugarCheck = detectSugar(food.name);
      if (sugarCheck.hasSugar && sugarCheck.severity !== 'low') {
        setPendingItem({ food, item: finalItem, matched: [`sugar: ${sugarCheck.keywords[0] || 'detected'}`] });
        return;
      }
    }

    onAdd(finalItem);
    setQuery('');
  };

  const confirmAdd = () => {
    if (!pendingItem) return;

    // Check if severe allergen needs double confirmation
    if (hasSevereAllergen(pendingItem.matched) && !showSevereConfirm) {
      setShowSevereConfirm(true);
      return;
    }

    onAdd(pendingItem.item);
    setPendingItem(null);
    setShowSevereConfirm(false);
    setQuery('');
  };

  const findAlternative = () => {
    if (pendingItem) {
      // Set query to the food's category to help find alternatives
      const food = pendingItem.food;
      setQuery(food.category || '');
      setPendingItem(null);
      setShowSevereConfirm(false);
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
                const allergenCheck = checkAllergens(food.name, userAllergens, food.allergens);
                const conditionWarnings = checkFoodForConditions(food.name, userConditions);
                const sugarCheck = isSugarDetectionActive() ? detectSugar(food.name) : null;
                const hasAnyWarning = allergenCheck.hasConflict || conditionWarnings.length > 0 || (sugarCheck?.hasSugar && sugarCheck.severity !== 'low');

                return (
                  <motion.div
                    key={food.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-all ${
                      compareSelection.some(c => c.id === food.id) ? 'ring-2 ring-primary/50' : ''
                    }`}
                  >
                    <button onClick={() => handleAdd(food)} className="text-left flex-1 min-w-0 active:scale-[0.98]">
                      <div className="flex items-center gap-1.5 flex-wrap">
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
                        {conditionWarnings.map((w, i) => (
                          <span key={`cond-${i}`} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[9px] font-bold ${
                            w.severity === 'high'
                              ? 'bg-destructive/10 border-destructive/20 text-destructive'
                              : w.severity === 'medium'
                              ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400'
                              : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                          }`}>
                            <span className="text-[8px]">{w.icon}</span>
                            {w.condition}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {food.hindi} · {food.defaultServing}{food.servingUnit} · {item.calories} kcal
                        {cost ? ` · ₹${cost}` : ''}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          const foodItem = { ...indianFoodToFoodItem(food), id: food.id, itemCost: cost || 0 };
                          setCompareSelection(prev => {
                            if (prev.some(c => c.id === food.id)) return prev.filter(c => c.id !== food.id);
                            if (prev.length >= 3) return prev;
                            return [...prev, foodItem];
                          });
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          compareSelection.some(c => c.id === food.id) ? 'bg-primary/20' : 'bg-muted'
                        }`}
                      >
                        <Scale className={`w-3.5 h-3.5 ${compareSelection.some(c => c.id === food.id) ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                      <button onClick={() => handleAdd(food)} className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        hasAnyWarning ? 'bg-destructive/10' : 'bg-primary/10'
                      }`}>
                        <Plus className={`w-4 h-4 ${hasAnyWarning ? 'text-destructive' : 'text-primary'}`} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Floating Compare Pill */}
            {compareSelection.length >= 2 && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="sticky bottom-2 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-fab flex items-center gap-2 mx-auto active:scale-[0.97] transition-transform"
                onClick={() => setCompareSheetOpen(true)}
              >
                <Scale className="w-4 h-4" /> Compare ({compareSelection.length})
              </motion.button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Standard Allergen Confirmation Dialog */}
      <AlertDialog open={!!pendingItem && !showSevereConfirm} onOpenChange={v => { if (!v) { setPendingItem(null); setShowSevereConfirm(false); } }}>
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
            <button
              onClick={findAlternative}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              🔄 Find Safe Alternative
            </button>
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

      {/* Severe Allergy Double Confirmation */}
      <AlertDialog open={showSevereConfirm} onOpenChange={v => { if (!v) { setShowSevereConfirm(false); setPendingItem(null); } }}>
        <AlertDialogContent className="rounded-2xl border-2 border-destructive/50">
          <AlertDialogHeader>
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10 }}
              className="w-16 h-16 mx-auto mb-2 rounded-full bg-destructive/20 flex items-center justify-center"
            >
              <ShieldAlert className="w-8 h-8 text-destructive animate-pulse" />
            </motion.div>
            <AlertDialogTitle className="text-center text-destructive text-lg">
              🚨 Severe Allergy Risk
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-2">
              <span className="block font-bold text-foreground text-base">{pendingItem?.food.name}</span>
              <span className="block text-destructive font-semibold">
                This food may contain {pendingItem?.matched.map(a => `${getAllergenEmoji(a)} ${getAllergenLabel(a)}`).join(', ')} which can cause a severe allergic reaction.
              </span>
              <span className="block text-muted-foreground text-xs mt-2">
                This is a high-risk allergen. Please confirm you understand the risk.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <button
              onClick={findAlternative}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              🔄 Find Safe Alternative
            </button>
            <button
              onClick={confirmAdd}
              disabled={!severeButtonEnabled}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-all ${
                severeButtonEnabled
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              }`}
            >
              {severeButtonEnabled ? 'I understand the risk – Log Anyway' : 'Please wait (3s)...'}
            </button>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Comparison Sheet */}
      <ComparisonSheet
        open={compareSheetOpen}
        onClose={() => { setCompareSheetOpen(false); setCompareSelection([]); }}
        items={compareSelection.map(buildFromFoodItem)}
        onPick={(picked) => {
          const food = compareSelection.find(f => `food-${f.id}` === picked.id);
          if (food) {
            onAdd(food);
            setQuery('');
          }
          setCompareSelection([]);
        }}
      />
    </>
  );
}
