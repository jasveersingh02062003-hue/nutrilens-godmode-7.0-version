import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, ExternalLink, Shield } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AdCreativeData } from '@/hooks/useAdServing';

interface SponsoredCardProps {
  ad: AdCreativeData;
  onImpression: () => void;
  onClick: () => void;
  variant?: 'banner' | 'native' | 'nudge';
}

const PES_BADGE = {
  high: { bg: 'bg-green-500/15', text: 'text-green-700', border: 'border-green-500/20', label: 'Great Value' },
  mid: { bg: 'bg-amber-500/15', text: 'text-amber-700', border: 'border-amber-500/20', label: 'Good' },
  low: { bg: 'bg-orange-500/15', text: 'text-orange-700', border: 'border-orange-500/20', label: 'Fair' },
};

function getPesTier(score: number) {
  if (score >= 70) return PES_BADGE.high;
  if (score >= 50) return PES_BADGE.mid;
  return PES_BADGE.low;
}

export default function SponsoredCard({ ad, onImpression, onClick, variant = 'native' }: SponsoredCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [impressionLogged, setImpressionLogged] = useState(false);

  // Log impression when card is visible
  useEffect(() => {
    if (impressionLogged || !cardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onImpression();
          setImpressionLogged(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [impressionLogged, onImpression]);

  const pesTier = getPesTier(ad.pesScore);

  if (variant === 'banner') {
    return (
      <motion.button
        ref={cardRef as any}
        onClick={onClick}
        className="w-full p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 text-left relative overflow-hidden"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Sponsored disclosure — ASCI/ad-policy compliant: 12px, contrasting */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground/10 backdrop-blur-sm">
          <Sparkles className="w-3 h-3 text-foreground/70" />
          <span className="text-xs font-semibold text-foreground/80 tracking-wide">Sponsored</span>
        </div>

        <div className="flex items-center gap-3">
          {ad.imageUrl && (
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src={ad.imageUrl} alt={ad.headline} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{ad.headline}</p>
            {ad.subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{ad.subtitle}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              {/* PES badge */}
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${pesTier.bg} ${pesTier.text} ${pesTier.border}`}>
                <Shield className="w-2.5 h-2.5" />
                PES {ad.pesScore}
              </span>
              <span className="text-[10px] font-medium text-primary">{ad.ctaText} →</span>
            </div>
          </div>
        </div>
      </motion.button>
    );
  }

  if (variant === 'nudge') {
    return (
      <motion.button
        ref={cardRef as any}
        onClick={onClick}
        className="w-full p-3 rounded-xl bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/15 text-left relative"
        initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute top-1.5 right-2 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-muted-foreground" />
          <span className="text-[8px] text-muted-foreground">Sponsored</span>
        </div>
        <p className="text-xs font-semibold text-foreground pr-14">{ad.headline}</p>
        {ad.subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{ad.subtitle}</p>}
        <span className="text-[10px] font-bold text-primary mt-1 inline-block">{ad.ctaText} →</span>
      </motion.button>
    );
  }

  // Native card (default) — blends with MarketItemCard style
  return (
    <motion.button
      ref={cardRef as any}
      onClick={onClick}
      className="w-full p-3 rounded-2xl bg-gradient-to-br from-primary/8 via-primary/3 to-transparent border border-primary/10 text-left relative"
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Sponsored disclosure — 12px, contrasting (ad-policy compliant) */}
      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground/10 backdrop-blur-sm">
        <Sparkles className="w-3 h-3 text-foreground/70" />
        <span className="text-xs font-semibold text-foreground/80">Sponsored</span>
      </div>

      <div className="flex items-center gap-3">
        {ad.imageUrl ? (
          <div className="w-12 h-12 rounded-xl bg-primary/10 overflow-hidden flex-shrink-0">
            <img src={ad.imageUrl} alt={ad.headline} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary/50" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-foreground truncate pr-16">{ad.headline}</p>
          <p className="text-[10px] text-muted-foreground">{ad.brandName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${pesTier.bg} ${pesTier.text} ${pesTier.border}`}>
              <Shield className="w-2 h-2" />
              PES {ad.pesScore}
            </span>
            <span className="text-[10px] font-medium text-primary flex items-center gap-0.5">
              {ad.ctaText} <ExternalLink className="w-2.5 h-2.5" />
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
