import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Zap, Lock, Copy, X, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  generateSurvivalKit,
  saveSurvivalKit,
  type SurvivalKitResult,
  type SurvivalMode,
} from '@/lib/grocery-survival';
import { getBudgetSettings } from '@/lib/expense-store';
import { getProfile } from '@/lib/store';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MODE_LABELS: Record<SurvivalMode, { label: string; emoji: string; color: string }> = {
  survival: { label: 'Survival', emoji: '🔥', color: 'bg-destructive/10 text-destructive' },
  standard: { label: 'Standard', emoji: '⚡', color: 'bg-primary/10 text-primary' },
  comfort: { label: 'Comfort', emoji: '✨', color: 'bg-accent text-accent-foreground' },
};

const PES_DOT: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

export default function SurvivalKitSheet({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<'idle' | 'loading' | 'result'>('idle');
  const [budget, setBudget] = useState('');
  const [result, setResult] = useState<SurvivalKitResult | null>(null);

  useEffect(() => {
    if (open) {
      setStep('idle');
      setResult(null);
      const bs = getBudgetSettings();
      const weekly = Math.round((bs.weeklyBudget || 0));
      setBudget(weekly > 0 ? String(weekly) : '1000');
    }
  }, [open]);

  const handleGenerate = () => {
    const val = parseInt(budget, 10);
    if (!val || val < 50) {
      toast({ title: 'Enter a valid budget', description: 'Minimum ₹50', variant: 'destructive' });
      return;
    }
    setStep('loading');
    setTimeout(() => {
      const kit = generateSurvivalKit(val);
      setResult(kit);
      setStep('result');
    }, 1200);
  };

  const handleLock = () => {
    if (!result) return;
    saveSurvivalKit(result);
    toast({ title: '🔒 Plan Locked!', description: 'Your survival kit is saved.' });
    onOpenChange(false);
  };

  const handleCopy = () => {
    if (!result) return;
    const text = result.items
      .map(i => `${i.name} × ${i.quantity} — ₹${i.cost} (${i.protein}g protein)`)
      .join('\n');
    const summary = `\nTotal: ₹${result.totalCost} | ${result.totalProtein}g protein | ${result.proteinCoverage}% coverage`;
    navigator.clipboard.writeText(text + summary);
    toast({ title: 'Copied!', description: 'List copied to clipboard' });
  };

  const profile = getProfile();
  const userName = profile?.name || 'there';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl overflow-y-auto pb-8">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Max Protein Survival Kit
          </SheetTitle>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {step === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5 pt-2"
            >
              <p className="text-sm text-muted-foreground">
                Hey {userName}! Enter your weekly grocery budget and we'll build the
                most protein-efficient shopping list possible.
              </p>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Weekly Budget (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <input
                    type="number"
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                    className="w-full pl-8 pr-3 py-3 rounded-xl bg-muted text-lg font-bold outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="1000"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Daily: ₹{Math.round(parseInt(budget) / 7 || 0)} · Per meal: ₹{Math.round(parseInt(budget) / 21 || 0)}
                </p>
              </div>

              <button
                onClick={handleGenerate}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" /> Generate Survival Kit
              </button>
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 space-y-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-12 h-12 rounded-full border-4 border-muted border-t-primary"
              />
              <p className="text-sm font-semibold text-foreground">Optimizing for max protein...</p>
              <p className="text-xs text-muted-foreground">Filtering {'>'}50 foods by PES score</p>
            </motion.div>
          )}

          {step === 'result' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-2"
            >
              {/* Mode badge */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${MODE_LABELS[result.mode].color}`}>
                  {MODE_LABELS[result.mode].emoji} {MODE_LABELS[result.mode].label} Mode
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  Budget: ₹{result.budget}
                </span>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="card-subtle p-3 text-center">
                  <p className="text-lg font-bold text-foreground">₹{result.totalCost}</p>
                  <p className="text-[10px] text-muted-foreground">Total Cost</p>
                </div>
                <div className="card-subtle p-3 text-center">
                  <p className="text-lg font-bold text-primary">{result.totalProtein}g</p>
                  <p className="text-[10px] text-muted-foreground">Protein</p>
                </div>
                <div className="card-subtle p-3 text-center">
                  <p className={`text-lg font-bold ${result.proteinCoverage >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {result.proteinCoverage}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">Coverage</p>
                </div>
              </div>

              {/* Impact statement */}
              {result.savings > 0 && (
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                  <p className="text-xs font-semibold text-foreground">
                    💡 Saved ₹{result.savings} vs low-efficiency foods while getting {result.totalProtein}g protein
                  </p>
                </div>
              )}

              {/* Items list */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Shopping List ({result.items.length} items)
                </p>
                {result.items.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="card-subtle p-3 flex items-center gap-3"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PES_DOT[item.pesColor]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.quantity} {item.unit} · {item.protein}g protein · {item.calories} kcal
                      </p>
                    </div>
                    <p className="text-xs font-bold text-foreground whitespace-nowrap">₹{item.cost}</p>
                  </motion.div>
                ))}
              </div>

              {/* Protein coverage bar */}
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Protein: {result.totalProtein}g / {result.proteinTarget}g target</span>
                  <span>{result.proteinCoverage}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${result.proteinCoverage >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: `${Math.min(result.proteinCoverage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-3 rounded-xl bg-muted text-sm font-semibold text-foreground flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" /> Copy List
                </button>
                <button
                  onClick={handleLock}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" /> Lock This Plan
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
