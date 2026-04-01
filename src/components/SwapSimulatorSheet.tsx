import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getSwapAlternatives, calculateSwapImpact, type SwapAlternative, type SwapImpact } from '@/lib/swap-engine';
import { getRecipeById } from '@/lib/recipes';
import { getRecipeCost } from '@/lib/recipe-cost';
import { getRecipeImage } from '@/lib/recipe-images';
import { computePES } from '@/lib/pes-engine';
import { Zap, ArrowLeft, AlertTriangle, Star, DollarSign, Dumbbell, Timer, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ComparisonSheet from '@/components/ComparisonSheet';
import { buildFromRecipe, type CompareItem } from '@/lib/compare-helpers';

interface Props {
  open: boolean;
  onClose: () => void;
  originalRecipeId: string;
  mealType: string;
  onApply: (recipeId: string, impact: SwapImpact) => void;
}

export default function SwapSimulatorSheet({ open, onClose, originalRecipeId, mealType, onApply }: Props) {
  const [step, setStep] = useState<'alternatives' | 'comparison'>('alternatives');
  const [alternatives, setAlternatives] = useState<SwapAlternative[]>([]);
  const [selected, setSelected] = useState<SwapAlternative | null>(null);
  const [impact, setImpact] = useState<SwapImpact | null>(null);
  const [compareAllOpen, setCompareAllOpen] = useState(false);

  const original = getRecipeById(originalRecipeId);
  const originalCost = original ? getRecipeCost(original) : 0;

  useEffect(() => {
    if (open && originalRecipeId) {
      setStep('alternatives');
      setSelected(null);
      setImpact(null);
      setAlternatives(getSwapAlternatives(originalRecipeId, mealType));
    }
  }, [open, originalRecipeId, mealType]);

  const handleSelect = (alt: SwapAlternative) => {
    setSelected(alt);
    setImpact(calculateSwapImpact(originalRecipeId, alt.recipe));
    setStep('comparison');
  };

  const handleApply = () => {
    if (selected && impact) {
      // PES Reinforcement (Feature 5)
      if (original && selected.recipe) {
        const oldPES = computePES({ protein: original.protein, calories: original.calories, cost: originalCost, name: original.name });
        const newCost = getRecipeCost(selected.recipe);
        const newPES = computePES({ protein: selected.recipe.protein, calories: selected.recipe.calories, cost: newCost, name: selected.recipe.name });
        if (newPES > 0 && oldPES > 0 && newPES / oldPES > 1.5) {
          const ratio = Math.round(newPES / oldPES * 10) / 10;
          toast.success(`Nice choice 👏 You picked a ${ratio}x better protein value meal!`);
        }
      }
      onApply(selected.recipe.id, impact);
      onClose();
    }
  };

  if (!original) return null;

  const highlightColor = (h: string) => {
    if (h === 'Best Choice') return 'bg-primary/15 text-primary border-primary/30';
    if (h === 'Cheapest') return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
    return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto p-0">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-primary" /> Smart Swap
          </SheetTitle>
        </SheetHeader>

        {/* Current meal header */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
            <img src={getRecipeImage(original.id, mealType)} alt={original.name} className="w-12 h-12 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Current</p>
              <p className="text-sm font-bold text-foreground truncate">{original.name}</p>
              <p className="text-[10px] text-muted-foreground">₹{originalCost} · {original.calories} kcal · {original.protein}g protein</p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'alternatives' && (
            <motion.div key="alts" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-5 pb-6 space-y-2">
              {alternatives.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No alternatives found for this meal type.</p>
              ) : (
                <>
                  {alternatives.length >= 2 && (
                    <button
                      onClick={() => setCompareAllOpen(true)}
                      className="w-full py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform mb-1"
                    >
                      <Scale className="w-4 h-4" /> Compare All ⚖️
                    </button>
                  )}
                alternatives.map((alt, idx) => (
                  <motion.button key={alt.recipe.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
                    onClick={() => handleSelect(alt)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-sm transition-all text-left active:scale-[0.98]">
                    <img src={getRecipeImage(alt.recipe.id, mealType)} alt={alt.recipe.name} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground truncate">{alt.recipe.name}</p>
                        {alt.bestChoice && <Star className="w-3 h-3 text-primary flex-shrink-0" />}
                      </div>
                      <p className="text-lg font-bold text-foreground">₹{alt.cost}</p>
                      {alt.proteinDrop && (
                        <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> Lower protein
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${highlightColor(alt.highlight)}`}>
                      {alt.highlight === 'Best Choice' ? '⭐ Best Choice' : alt.highlight}
                    </span>
                  </motion.button>
                ))
              )}
            </motion.div>
          )}

          {step === 'comparison' && selected && impact && (
            <motion.div key="compare" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-5 pb-6 space-y-4">
              {/* Side by side */}
              <div className="flex gap-2">
                <div className="flex-1 p-3 rounded-xl bg-destructive/5 border border-destructive/15 text-center">
                  <p className="text-[10px] font-bold text-destructive uppercase tracking-wider mb-1">Current</p>
                  <p className="text-sm font-bold text-foreground truncate">{original.name}</p>
                  <p className="text-lg font-bold text-foreground">₹{originalCost}</p>
                </div>
                <div className="flex-1 p-3 rounded-xl bg-primary/5 border border-primary/15 text-center">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Better</p>
                  <p className="text-sm font-bold text-foreground truncate">{selected.recipe.name}</p>
                  <p className="text-lg font-bold text-foreground">₹{selected.cost}</p>
                </div>
              </div>

              {/* Impact lines */}
              <div className="space-y-2.5 py-2">
                {/* Cost */}
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${impact.costDiff <= 0 ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                    <DollarSign className={`w-4 h-4 ${impact.costDiff <= 0 ? 'text-emerald-600' : 'text-destructive'}`} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {impact.costDiff <= 0 ? `Save ₹${Math.abs(impact.costDiff)}` : `Costs ₹${impact.costDiff} more`}
                  </p>
                </div>
                {/* Protein */}
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${impact.proteinDiff >= 0 ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                    <Dumbbell className={`w-4 h-4 ${impact.proteinDiff >= 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {impact.proteinDiff >= 0 ? `+${impact.proteinDiff}g protein` : `${impact.proteinDiff}g protein`}
                    {impact.proteinDropWarning && <span className="text-amber-600 text-xs ml-1">⚠</span>}
                  </p>
                </div>
                {/* Timeline */}
                {impact.timelineDays !== 0 && (
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${impact.timelineDays > 0 ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                      <Timer className={`w-4 h-4 ${impact.timelineDays > 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {impact.timelineDays > 0
                        ? `Reach goal ${impact.timelineDays} day${impact.timelineDays > 1 ? 's' : ''} faster`
                        : `${Math.abs(impact.timelineDays)} day${Math.abs(impact.timelineDays) > 1 ? 's' : ''} slower`}
                    </p>
                  </div>
                )}
              </div>

              {/* Warnings */}
              {impact.budgetWarning && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/8 border border-destructive/20">
                  <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-xs font-semibold text-destructive">This will break today's budget</p>
                </div>
              )}
              {impact.proteinDropWarning && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs font-semibold text-amber-600">Protein drops significantly — add a snack later</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setStep('alternatives'); setSelected(null); setImpact(null); }}
                  className="flex-1 py-3 rounded-xl bg-muted text-foreground text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button onClick={handleApply}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-1.5 shadow-fab active:scale-[0.98] transition-transform">
                  <Zap className="w-3.5 h-3.5" /> Apply Swap
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
