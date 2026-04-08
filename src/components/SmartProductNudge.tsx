import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, ExternalLink, Sparkles, TrendingDown } from 'lucide-react';
import { useNutritionGapAds } from '@/hooks/useNutritionGapAds';
import type { ProductRecommendation } from '@/lib/nutrition-gap-ads';

interface Props {
  surface: 'dashboard' | 'planner' | 'budget' | 'market';
  variant?: 'full' | 'compact';
  className?: string;
  maxItems?: number;
}

function NudgeCard({
  rec,
  gaps,
  remainingBudget,
  variant,
  onImpression,
  onClick,
  onDismiss,
}: {
  rec: ProductRecommendation;
  gaps: { proteinGap: number; calorieGap: number };
  remainingBudget: number;
  variant: 'full' | 'compact';
  onImpression: (r: ProductRecommendation) => void;
  onClick: (r: ProductRecommendation) => void;
  onDismiss: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const impressionLogged = useRef(false);

  useEffect(() => {
    if (!cardRef.current || impressionLogged.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionLogged.current) {
          impressionLogged.current = true;
          onImpression(rec);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [rec, onImpression]);

  if (variant === 'compact') {
    return (
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border/50 p-3 bg-gradient-to-r from-primary/[0.03] to-transparent"
      >
        <div className="flex items-center gap-3">
          {rec.imageUrl && (
            <img src={rec.imageUrl} alt={rec.productName} className="w-9 h-9 rounded-lg object-cover shrink-0" loading="lazy" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`text-[8px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded ${
                rec.isSponsored ? 'text-muted-foreground/60 bg-muted/40' : 'text-primary/70 bg-primary/10'
              }`}>
                {rec.isSponsored ? 'Sponsored' : 'Suggested'}
              </span>
              {rec.pesScore > 0 && (
                <span className="text-[9px] font-bold text-green-600 dark:text-green-400 flex items-center gap-0.5">
                  <Shield className="w-2 h-2" /> {rec.pesScore}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-foreground truncate">{rec.productName}</p>
            <p className="text-[10px] text-muted-foreground">{rec.protein}g protein · ₹{rec.price}</p>
          </div>
          <button onClick={() => onClick(rec)} className="shrink-0 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
            {rec.ctaText || 'View'}
          </button>
        </div>
      </motion.div>
    );
  }

  // Full variant
  return (
    <AnimatePresence>
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="relative rounded-2xl border border-border/50 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04]" />
        <div className="relative p-4">
          {/* Gap context */}
          {gaps.proteinGap > 5 && (
            <div className="flex items-center gap-2 mb-3 rounded-xl bg-coral/8 px-3 py-2">
              <span className="text-sm">💪</span>
              <p className="text-[11px] font-medium text-foreground">
                You need <span className="font-bold">{Math.round(gaps.proteinGap)}g</span> more protein today
              </p>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                rec.isSponsored ? 'text-muted-foreground/60 bg-muted/40' : 'text-primary/70 bg-primary/10'
              }`}>
                {rec.isSponsored ? 'Sponsored' : '✨ Suggested'}
              </span>
              {rec.pesScore > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-600 dark:text-green-400">
                  <Shield className="w-2.5 h-2.5" /> PES {rec.pesScore}
                </span>
              )}
            </div>
            <button onClick={onDismiss} className="p-0.5">
              <X className="w-3.5 h-3.5 text-muted-foreground/50" />
            </button>
          </div>

          {/* Product */}
          <div className="flex items-start gap-3">
            {rec.imageUrl && (
              <img src={rec.imageUrl} alt={rec.productName} className="w-14 h-14 rounded-xl object-cover shrink-0" loading="lazy" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-snug">{rec.productName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rec.protein}g protein · {rec.calories} kcal · by {rec.brand}
              </p>
              {/* Budget impact */}
              <div className="flex items-center gap-1 mt-1.5">
                <TrendingDown className="w-3 h-3 text-primary" />
                <p className="text-[10px] font-medium text-primary">{rec.budgetImpact}</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => onClick(rec)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 transition-transform active:scale-[0.97]"
          >
            <Sparkles className="w-3 h-3" />
            {rec.ctaText || 'View Details'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function SmartProductNudge({ surface, variant = 'full', className = '', maxItems = 1 }: Props) {
  const { recommendations, gaps, remainingBudget, isLoading, logImpression, logClick } = useNutritionGapAds(surface);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (isLoading || recommendations.length === 0) return null;

  const visible = recommendations
    .filter(r => !dismissed.has(r.productId))
    .slice(0, maxItems);

  if (visible.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {visible.map(rec => (
        <NudgeCard
          key={rec.productId}
          rec={rec}
          gaps={gaps}
          remainingBudget={remainingBudget}
          variant={variant}
          onImpression={logImpression}
          onClick={logClick}
          onDismiss={() => setDismissed(prev => new Set(prev).add(rec.productId))}
        />
      ))}
    </div>
  );
}
