import { motion, AnimatePresence } from 'framer-motion';
import { getPESColor, getDynamicThreshold, findBetterAlternatives, type PESColor } from '@/lib/pes-engine';
import { getBudgetSettings } from '@/lib/expense-store';
import { getProfile } from '@/lib/store';

interface FoodData {
  name: string;
  cost: number;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

interface Props {
  open: boolean;
  food: FoodData;
  mealLabel: string;
  onConfirm: () => void;
  onEdit: () => void;
}

const COLOR_MAP: Record<PESColor, { bg: string; text: string; dot: string; label: string }> = {
  green: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Excellent Value' },
  yellow: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'OK Value' },
  red: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Poor Value' },
};

export default function PESBreakdownModal({ open, food, mealLabel, onConfirm, onEdit }: Props) {
  if (!open || food.cost <= 0) return null;

  const profile = getProfile();
  const budget = getBudgetSettings();
  const dailyBudget = budget.period === 'week' ? budget.weeklyBudget / 7 : budget.monthlyBudget / 30;
  const isVeg = profile?.dietaryPrefs?.includes('veg') ?? false;

  const pes = food.protein / food.cost;
  const costPerGram = food.protein > 0 ? food.cost / food.protein : Infinity;
  const color = getPESColor(pes, dailyBudget, isVeg);
  const style = COLOR_MAP[color];

  // Find a better alternative for insight
  const alternatives = findBetterAlternatives(
    { name: food.name, price: food.cost, protein: food.protein },
    isVeg ? 'veg' : 'non_veg',
    1
  );
  const alt = alternatives[0];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="w-full max-w-lg rounded-t-3xl bg-card/95 backdrop-blur-xl border-t border-border p-5 pb-8 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">🍽️</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{food.name}</p>
                <p className="text-xs text-muted-foreground">₹{food.cost} • {food.calories} kcal</p>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
                className={`px-2.5 py-1 rounded-full ${style.bg} ${style.text} text-xs font-bold`}
              >
                {style.label}
              </motion.div>
            </div>

            {/* Nutrition grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Protein', value: `${food.protein}g`, accent: true },
                { label: 'Carbs', value: `${food.carbs}g` },
                { label: 'Fat', value: `${food.fat}g` },
              ].map((n, i) => (
                <motion.div
                  key={n.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className={`rounded-xl p-2.5 text-center ${n.accent ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50 border border-border'}`}
                >
                  <p className="text-[10px] text-muted-foreground font-medium">{n.label}</p>
                  <p className={`text-sm font-bold ${n.accent ? 'text-primary' : 'text-foreground'}`}>{n.value}</p>
                </motion.div>
              ))}
            </div>

            {/* PES + Cost per gram */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-xl bg-muted/50 border border-border p-3 mb-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <motion.span
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={`w-3 h-3 rounded-full ${style.dot}`}
                  />
                  <span className="text-xs font-semibold text-foreground">Protein/₹</span>
                </div>
                <span className={`text-lg font-black ${style.text}`}>{pes.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Cost per gram of protein</span>
                <span className="text-xs font-bold text-foreground">₹{costPerGram === Infinity ? '—' : costPerGram.toFixed(1)}/g</span>
              </div>
            </motion.div>

            {/* Insight */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="rounded-xl bg-primary/5 border border-primary/10 p-3 mb-5"
            >
              <p className="text-xs text-foreground/80 leading-relaxed">
                For ₹{food.cost} you get {food.protein}g protein — that's {pes.toFixed(2)}g/₹
                {color === 'red' && alt ? `. Try ${alt.name} for ${alt.pes.toFixed(1)}g/₹ instead.` : '.'}
                {color === 'green' ? ' Great choice for your budget!' : ''}
              </p>
            </motion.div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onEdit}
                className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold text-muted-foreground active:scale-[0.97] transition-transform"
              >
                Edit
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onConfirm}
                className="flex-[2] py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold"
              >
                Log to {mealLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
