
import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, ExternalLink } from 'lucide-react';
import { useAdServing } from '@/hooks/useAdServing';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  slot: string;
  className?: string;
}

export default function DashboardSponsoredCard({ slot, className = '' }: Props) {
  const { ad, isLoading, logImpression, logClick } = useAdServing(slot);
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const impressionLogged = useRef(false);
  const [dismissed, setDismissed] = useState(false);

  // IntersectionObserver for impression tracking
  useEffect(() => {
    if (!ad || !cardRef.current || impressionLogged.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionLogged.current) {
          impressionLogged.current = true;
          logImpression(user?.id);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [ad, user?.id, logImpression]);

  if (isLoading || !ad || dismissed) return null;

  const isNudge = slot === 'dashboard_protein_nudge' || slot === 'post_meal_suggestion';

  return (
    <AnimatePresence>
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`relative rounded-2xl border border-border/50 overflow-hidden ${className}`}
      >
        {/* Subtle sponsored gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04]" />

        <div className="relative p-4">
          {/* Top row: Sponsored badge + PES + dismiss */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80 bg-foreground/10 px-2 py-0.5 rounded">
                Sponsored
              </span>
              {ad.pesScore > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-green-600 dark:text-green-400">
                  <Shield className="w-3 h-3" /> PES {ad.pesScore}
                </span>
              )}
            </div>
            <button onClick={() => setDismissed(true)} className="p-0.5" aria-label="Dismiss sponsored content">
              <X className="w-3.5 h-3.5 text-muted-foreground/50" />
            </button>
          </div>

          {/* Content */}
          <div className="flex items-start gap-3">
            {ad.imageUrl && (
              <img
                src={ad.imageUrl}
                alt={ad.brandName}
                className="w-12 h-12 rounded-xl object-cover shrink-0"
                loading="lazy"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-snug">
                {ad.headline}
              </p>
              {ad.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {ad.subtitle}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                by {ad.brandName}
              </p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => logClick(user?.id)}
            className={`mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-transform active:scale-[0.97] ${
              isNudge
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            {ad.ctaText}
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
