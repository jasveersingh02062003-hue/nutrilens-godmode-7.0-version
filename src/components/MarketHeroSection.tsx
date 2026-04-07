import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { TrendingDown, Trophy, Zap, Target } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { getFoodImage } from '@/lib/food-images';

interface HeroItem {
  name: string;
  emoji: string;
  price: number;
  unit: string;
  protein: number;
  costPerGram: number;
  priceChange?: number;
  itemId?: string;
}

interface MarketHeroSectionProps {
  bestValue: HeroItem | null;
  biggestDrop: HeroItem | null;
  city: string;
  onTap?: (name: string) => void;
}

function FadeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      onLoad={() => setLoaded(true)}
      className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}

interface Slide {
  id: string;
  content: React.ReactNode;
}

export default function MarketHeroSection({ bestValue, biggestDrop, city, onTap }: MarketHeroSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeSlide, setActiveSlide] = useState(0);

  const slides: Slide[] = [];

  // Slide 1: Best Value Today
  if (bestValue) {
    const img = bestValue.itemId ? getFoodImage(bestValue.itemId) : null;
    slides.push({
      id: 'best-value',
      content: (
        <motion.button
          onClick={() => onTap?.(bestValue.name)}
          className="w-full p-4 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 text-left"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Best Protein Value Today</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
              {img ? (
                <FadeImage src={img} alt={bestValue.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">{bestValue.emoji}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-base font-bold text-foreground">{bestValue.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-semibold text-foreground">₹{bestValue.price}/{bestValue.unit}</span>
                <span className="text-xs text-muted-foreground">💪 {bestValue.protein}g protein</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-bold text-primary">₹{bestValue.costPerGram}/g protein</span>
                <span className="text-[10px] text-muted-foreground">📍 {city}</span>
              </div>
            </div>
            <div className="px-2.5 py-1.5 rounded-xl bg-primary/15">
              <Zap className="w-4 h-4 text-primary" />
            </div>
          </div>
        </motion.button>
      ),
    });
  }

  // Slide 2: Price Drop Alert
  if (biggestDrop && biggestDrop.priceChange && biggestDrop.priceChange < 0) {
    const img = biggestDrop.itemId ? getFoodImage(biggestDrop.itemId) : null;
    slides.push({
      id: 'price-drop',
      content: (
        <motion.button
          onClick={() => onTap?.(biggestDrop.name)}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-green-500/12 to-green-500/5 border border-green-500/20 text-left"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-4 h-4 text-green-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-600">Price Drop Alert</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center overflow-hidden">
              {img ? (
                <FadeImage src={img} alt={biggestDrop.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">{biggestDrop.emoji}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-base font-bold text-foreground">
                🔥 {biggestDrop.name} dropped {Math.abs(biggestDrop.priceChange)}%
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Now ₹{biggestDrop.price}/{biggestDrop.unit} — Buy before price goes up!
              </p>
            </div>
          </div>
        </motion.button>
      ),
    });
  }

  // Slide 3: Budget Challenge
  if (bestValue) {
    slides.push({
      id: 'budget-challenge',
      content: (
        <motion.button
          onClick={() => onTap?.(bestValue.name)}
          className="w-full p-4 rounded-2xl bg-gradient-to-br from-accent/15 via-accent/5 to-transparent border border-accent/20 text-left"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-4 h-4 text-accent-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent-foreground">₹100 Protein Challenge</span>
          </div>
          <p className="text-sm font-bold text-foreground">
            How much protein can you get for ₹100?
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Eggs + Milk combo = ~45g protein for under ₹100 in {city}
          </p>
          <span className="text-[10px] font-bold text-primary mt-2 inline-block">Try the challenge →</span>
        </motion.button>
      ),
    });
  }

  // Auto-rotate (skip if reduced motion preferred)
  useEffect(() => {
    if (slides.length <= 1 || prefersReducedMotion) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, prefersReducedMotion]);

  if (slides.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={slides[activeSlide]?.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {slides[activeSlide]?.content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => setActiveSlide(i)}
              className="relative h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === activeSlide ? 20 : 6 }}
            >
              <motion.div
                className={`absolute inset-0 rounded-full ${i === activeSlide ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                layoutId={undefined}
                transition={{ duration: 0.3 }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
