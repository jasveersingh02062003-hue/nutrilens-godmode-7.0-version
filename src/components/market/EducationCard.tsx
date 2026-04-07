import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';

const FACTS = [
  { fact: '100g paneer has same protein as 2 eggs but costs 3x more per gram', cta: 'Compare Now', items: ['Paneer', 'Eggs'] },
  { fact: 'Soya chunks give 52g protein per ₹85 — best veg protein value in India', cta: 'View Soya', items: ['Soya Chunks'] },
  { fact: 'Chicken breast has 31g protein with only 3.6g fat — leanest meat available', cta: 'See Details', items: ['Chicken Breast'] },
  { fact: 'Spirulina has 57g protein per 100g — more than any meat or dal', cta: 'Explore', items: ['Spirulina'] },
  { fact: 'Peanuts give 26g protein per ₹120/kg — cheapest high-protein nut', cta: 'View Peanuts', items: ['Peanuts'] },
  { fact: 'Moong dal sprouts multiply protein bioavailability by 2x vs raw dal', cta: 'Learn More', items: ['Moong Sprouts'] },
];

interface EducationCardProps {
  onItemTap?: (name: string) => void;
}

export default function EducationCard({ onItemTap }: EducationCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % FACTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const fact = FACTS[currentIndex];

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl bg-gradient-to-br from-accent/15 to-primary/5 border border-accent/20"
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80 mb-1">Did You Know?</p>
            <AnimatePresence mode="wait">
              <motion.p
                key={currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="text-[12px] font-medium text-foreground leading-relaxed"
              >
                {fact.fact}
              </motion.p>
            </AnimatePresence>
            {onItemTap && fact.items[0] && (
              <button
                onClick={() => onItemTap(fact.items[0])}
                className="mt-2 text-[10px] font-bold text-primary hover:underline"
              >
                {fact.cta} →
              </button>
            )}
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {FACTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`rounded-full transition-all ${
                i === currentIndex ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </motion.div>

      {/* Nav arrows */}
      <button
        onClick={() => setCurrentIndex(prev => (prev - 1 + FACTS.length) % FACTS.length)}
        className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background/80 border border-border/50 flex items-center justify-center"
      >
        <ChevronLeft className="w-3 h-3 text-muted-foreground" />
      </button>
      <button
        onClick={() => setCurrentIndex(prev => (prev + 1) % FACTS.length)}
        className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background/80 border border-border/50 flex items-center justify-center"
      >
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
      </button>
    </div>
  );
}
