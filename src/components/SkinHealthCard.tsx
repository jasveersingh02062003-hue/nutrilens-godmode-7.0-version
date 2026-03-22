import { useState, useMemo } from 'react';
import { X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProfile } from '@/lib/store';
import { getWeather } from '@/lib/weather-service';
import { shouldShowNudge } from '@/lib/behavior-stats';
import type { SkinConcerns } from '@/components/SkinConcernsSheet';
import { isPremium } from '@/lib/subscription-service';

interface SkinTip {
  icon: string;
  title: string;
  message: string;
  foods: string[];
}

const SKIN_TIPS: Record<string, SkinTip[]> = {
  acne: [
    { icon: '🟢', title: 'Acne-Fighting Foods', message: 'Zinc and low-GI foods reduce breakouts', foods: ['Pumpkin seeds', 'Chickpeas', 'Green tea', 'Berries'] },
    { icon: '🥬', title: 'Clear Skin Nutrients', message: 'Omega-3 & antioxidants calm inflammation', foods: ['Flaxseeds', 'Walnuts', 'Spinach', 'Amla'] },
    { icon: '🍵', title: 'Anti-Acne Habits', message: 'Replace sugary drinks with these', foods: ['Green tea', 'Turmeric milk', 'Nimbu pani', 'Coconut water'] },
  ],
  acne_summer: [
    { icon: '☀️', title: 'Summer Acne Care', message: 'Heat & sweat worsen breakouts — cool your skin from inside', foods: ['Coconut water', 'Cucumber', 'Watermelon', 'Mint chutney'] },
    { icon: '🧊', title: 'Beat Summer Breakouts', message: 'Low-GI cooling foods reduce summer acne flare-ups', foods: ['Buttermilk', 'Moong dal', 'Sattu drink', 'Curd rice'] },
  ],
  oily: [
    { icon: '💧', title: 'Oil-Balancing Foods', message: 'Zinc helps regulate sebum production', foods: ['Pumpkin seeds', 'Whole grains', 'Cucumber', 'Watermelon'] },
    { icon: '🥒', title: 'Light & Cooling', message: 'Water-rich foods balance oily skin', foods: ['Cucumber raita', 'Buttermilk', 'Moong sprouts'] },
  ],
  oily_summer: [
    { icon: '🌞', title: 'Summer Oil Control', message: 'Summer heat increases sebum — eat cooling, zinc-rich foods', foods: ['Ash gourd juice', 'Cucumber raita', 'Kokum sherbet', 'Pumpkin seeds'] },
    { icon: '🍉', title: 'Light Summer Meals', message: 'Avoid fried food; hydrating meals reduce oiliness', foods: ['Watermelon', 'Coconut water', 'Sprout salad', 'Curd'] },
  ],
  dry: [
    { icon: '🥑', title: 'Moisture-Boosting Foods', message: 'Healthy fats restore your skin barrier', foods: ['Almonds', 'Ghee', 'Avocado', 'Flaxseeds'] },
    { icon: '🥜', title: 'Vitamin E Sources', message: 'Vitamin E prevents moisture loss', foods: ['Sunflower seeds', 'Peanuts', 'Spinach', 'Sweet potato'] },
  ],
  dry_winter: [
    { icon: '❄️', title: 'Winter Skin Rescue', message: 'Cold air strips moisture — warm fats & vitamin E protect skin', foods: ['Ghee', 'Til ladoo', 'Bajra roti', 'Almonds'] },
    { icon: '🫓', title: 'Winter Moisturizing Foods', message: 'Traditional winter foods are naturally skin-nourishing', foods: ['Pinni', 'Gajak', 'Makhan', 'Sweet potato'] },
  ],
  dull: [
    { icon: '🍊', title: 'Glow-Boosting Foods', message: 'Vitamin C stimulates collagen for radiance', foods: ['Amla', 'Orange', 'Bell pepper', 'Guava'] },
    { icon: '🫐', title: 'Antioxidant Power', message: 'Berries & tomatoes fight dull skin', foods: ['Berries', 'Pomegranate', 'Beetroot', 'Carrot'] },
  ],
  pigmentation: [
    { icon: '🍅', title: 'Even Tone Foods', message: 'Lycopene & vitamin C reduce dark spots', foods: ['Tomatoes', 'Citrus fruits', 'Turmeric', 'Green leafy veg'] },
    { icon: '🥕', title: 'Skin Brighteners', message: 'Beta-carotene supports even skin tone', foods: ['Carrots', 'Sweet potato', 'Papaya', 'Mango'] },
  ],
  sensitive: [
    { icon: '🌸', title: 'Soothing Foods', message: 'Anti-inflammatory nutrients calm reactive skin', foods: ['Turmeric', 'Ginger', 'Oats', 'Chamomile tea'] },
    { icon: '🫖', title: 'Gentle Nutrition', message: 'Omega-3 reduces skin sensitivity', foods: ['Walnuts', 'Flaxseeds', 'Coconut oil', 'Fish'] },
  ],
};

export default function SkinHealthCard() {
  const [dismissed, setDismissed] = useState(false);
  const profile = getProfile();
  const skinConcerns: SkinConcerns | undefined = (profile as any)?.skinConcerns;
  const weather = getWeather();

  const tip = useMemo(() => {
    if (!skinConcerns) return null;

    // Pick the most relevant concern
    const activeConcerns = (['acne', 'oily', 'dry', 'dull', 'pigmentation', 'sensitive'] as const)
      .filter(k => skinConcerns[k]);
    if (activeConcerns.length === 0) return null;

    // Seasonal adjustment: prioritize dry in winter, oily/acne in summer
    let primary: string = activeConcerns[0];
    let tipKey: string = primary;

    if (weather.season === 'winter' && skinConcerns.winterDry && activeConcerns.includes('dry')) {
      primary = 'dry';
      tipKey = 'dry_winter'; // Use winter-specific dry tips
    } else if (weather.season === 'summer' && skinConcerns.summerOily) {
      if (activeConcerns.includes('acne')) {
        primary = 'acne';
        tipKey = 'acne_summer';
      } else if (activeConcerns.includes('oily')) {
        primary = 'oily';
        tipKey = 'oily_summer';
      }
    }

    // Fall back to base tips if seasonal variant doesn't exist
    const tips = SKIN_TIPS[tipKey] || SKIN_TIPS[primary];
    if (!tips || tips.length === 0) return null;

    const dayIndex = new Date().getDate() % tips.length;
    return tips[dayIndex];
  }, [skinConcerns, weather.season]);

  if (!tip || dismissed || !shouldShowNudge('skin') || !isPremium()) return null;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 to-primary/[0.02] overflow-hidden px-4 py-3"
        >
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-background/60 flex items-center justify-center"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>

          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-semibold text-primary">Skin Health Tip</span>
          </div>

          <p className="text-xs font-medium text-foreground pr-6">
            {tip.icon} {tip.title}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{tip.message}</p>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {tip.foods.map(food => (
              <span
                key={food}
                className="px-2 py-0.5 rounded-md bg-background/70 border border-border text-[9px] font-medium text-foreground"
              >
                {food}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
