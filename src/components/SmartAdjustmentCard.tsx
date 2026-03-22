// ============================================
// NutriLens AI – Smart Adjustment Card (v2)
// ============================================
// Single-action pattern: shows adjustment summary with one primary action.
// Behavior insight shown when pattern detected.

import { useState } from 'react';
import { X, SlidersHorizontal, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { type AdjustmentResult } from '@/lib/smart-adjustment';
import { isPremium } from '@/lib/subscription-service';

interface Props {
  result: AdjustmentResult;
  mealLabel: string;
  onAdjustManually: () => void;
  onDismiss: () => void;
}

export default function SmartAdjustmentCard({ result, mealLabel, onAdjustManually, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isOver = result.type === 'overeat';
  const absDeviation = Math.abs(result.deviation);
  const hasProteinProtection = result.adjustments.some(a => a.proteinProtected);

  // Only show for premium users
  if (!isPremium()) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`relative rounded-2xl border px-4 py-3 ${
          isOver ? 'border-amber-500/20 bg-amber-500/5' : 'border-primary/15 bg-primary/5'
        }`}
      >
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-background/60 flex items-center justify-center"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
            isOver ? 'bg-amber-500/10' : 'bg-primary/10'
          }`}>
            <span className="text-sm">{isOver ? '⚠️' : '💡'}</span>
          </div>
          <div className="flex-1 pr-4">
            <p className="text-xs font-semibold text-foreground">
              {mealLabel} ✔ — {isOver ? 'Over' : 'Under'} by {absDeviation} kcal
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {result.message}
            </p>

            {/* Protein protection badge */}
            {hasProteinProtection && (
              <div className="flex items-center gap-1 mt-1.5 px-2 py-1 rounded-md bg-primary/5 border border-primary/10 w-fit">
                <Shield className="w-3 h-3 text-primary" />
                <span className="text-[9px] font-semibold text-primary">Protein targets protected</span>
              </div>
            )}

            {/* Inline micro-intervention: adjusted targets */}
            <div className="space-y-1 mt-2">
              {result.adjustments.map(adj => (
                <p key={adj.mealType} className="text-[10px] text-muted-foreground">
                  {adj.label}: <span className="line-through">{adj.originalTarget}</span> →{' '}
                  <span className={`font-semibold ${adj.change < 0 ? 'text-amber-600' : 'text-primary'}`}>
                    {adj.newTarget} kcal
                  </span>
                  {adj.proteinProtected && ' 🛡️'}
                </p>
              ))}
            </div>

            {/* Behavior insight */}
            {result.behaviorInsight && (
              <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-card border border-border">
                <p className="text-[10px] text-muted-foreground">
                  💡 {result.behaviorInsight}
                </p>
              </div>
            )}

            {/* Single action: adjust manually */}
            <button
              onClick={onAdjustManually}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20 hover:bg-primary/15 active:scale-[0.97] transition-all"
            >
              <SlidersHorizontal className="w-3 h-3" />
              Adjust manually
            </button>
          </div>
        </div>
    </motion.div>
  );
}