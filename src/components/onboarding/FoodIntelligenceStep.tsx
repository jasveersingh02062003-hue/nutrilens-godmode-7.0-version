import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, Sparkles, Heart, Baby, Target } from 'lucide-react';

interface Props {
  conditions: string[];
  skinConcern: string;
  goalType: string;
  genderSpecific: {
    pcos?: boolean;
    pregnancy?: boolean;
    breastfeeding?: boolean;
  };
  dietType: string;
}

const CONDITION_RULES: Record<string, { label: string; icon: string; avoid: string[]; prefer: string[] }> = {
  diabetes: {
    label: 'Diabetes',
    icon: '🩸',
    avoid: ['White rice', 'Sugar', 'Soft drinks', 'Maida', 'Sweet lassi'],
    prefer: ['Brown rice', 'Oats', 'Millets', 'Dal', 'Green vegetables'],
  },
  hypertension: {
    label: 'Hypertension',
    icon: '💓',
    avoid: ['Pickle', 'Papad', 'Processed foods', 'Namkeen', 'Soy sauce'],
    prefer: ['Banana', 'Spinach', 'Sweet potato', 'Low-fat curd', 'Coconut water'],
  },
  highCholesterol: {
    label: 'High Cholesterol',
    icon: '🫀',
    avoid: ['Fried snacks', 'Butter', 'Red meat', 'Full-fat cream', 'Coconut oil'],
    prefer: ['Oats', 'Walnuts', 'Flaxseed', 'Fish', 'Olive oil'],
  },
  pcos: {
    label: 'PCOS',
    icon: '🌸',
    avoid: ['Dairy', 'Refined carbs', 'Sugary drinks', 'White bread', 'Jalebi'],
    prefer: ['Berries', 'Lean protein', 'Cinnamon', 'Green tea', 'Flaxseed'],
  },
  thyroid: {
    label: 'Thyroid',
    icon: '🦋',
    avoid: ['Raw cruciferous vegs', 'Soy (excess)', 'Gluten (if sensitive)'],
    prefer: ['Selenium-rich foods', 'Brazil nuts', 'Eggs', 'Fish', 'Iodised salt'],
  },
  ibs: {
    label: 'IBS',
    icon: '🫄',
    avoid: ['Spicy food', 'Dairy', 'Beans (excess)', 'Onion', 'Garlic'],
    prefer: ['Oats', 'Rice', 'Carrots', 'Banana', 'Curd (small qty)'],
  },
  anemia: {
    label: 'Anemia',
    icon: '🩸',
    avoid: ['Tea with meals', 'Coffee with meals', 'Calcium-rich with iron'],
    prefer: ['Spinach', 'Lentils', 'Jaggery', 'Pomegranate', 'Beetroot'],
  },
};

const SKIN_RULES: Record<string, { avoid: string[]; prefer: string[] }> = {
  'acne-prone': {
    avoid: ['Dairy', 'Fried foods', 'Sugar', 'White bread'],
    prefer: ['Pumpkin seeds', 'Green vegetables', 'Berries', 'Turmeric'],
  },
  oily: {
    avoid: ['Fried foods', 'High-GI carbs', 'Excess dairy'],
    prefer: ['Cucumber', 'Watermelon', 'Whole grains', 'Zinc-rich foods'],
  },
  dry: {
    avoid: ['Excess caffeine', 'Alcohol', 'Processed foods'],
    prefer: ['Avocado', 'Almonds', 'Walnuts', 'Ghee', 'Flaxseed'],
  },
  sensitive: {
    avoid: ['Spicy food', 'Alcohol', 'Processed foods'],
    prefer: ['Turmeric', 'Oats', 'Coconut', 'Banana', 'Sweet potato'],
  },
  eczema: {
    avoid: ['Dairy', 'Eggs (if trigger)', 'Gluten', 'Processed foods'],
    prefer: ['Flaxseed', 'Walnuts', 'Fatty fish', 'Turmeric', 'Probiotics'],
  },
  rosacea: {
    avoid: ['Spicy food', 'Hot drinks', 'Alcohol', 'Histamine-rich foods'],
    prefer: ['Anti-inflammatory foods', 'Berries', 'Green tea', 'Omega-3'],
  },
  psoriasis: {
    avoid: ['Alcohol', 'Red meat', 'Processed foods', 'Nightshades'],
    prefer: ['Fatty fish', 'Turmeric', 'Leafy greens', 'Vitamin D foods'],
  },
};

const SKIN_LABELS: Record<string, string> = {
  'acne-prone': 'Acne-Prone', oily: 'Oily', dry: 'Dry', combination: 'Combination',
  sensitive: 'Sensitive', eczema: 'Eczema', rosacea: 'Rosacea', psoriasis: 'Psoriasis',
};

const stagger = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, type: 'spring' as const, stiffness: 500, damping: 35 } }),
};

export default function FoodIntelligenceStep({ conditions, skinConcern, goalType, genderSpecific, dietType }: Props) {
  const activeConditions = conditions.filter(c => CONDITION_RULES[c]);
  const skinRules = skinConcern && skinConcern !== 'none' ? SKIN_RULES[skinConcern] : null;
  const hasAnything = activeConditions.length > 0 || skinRules || goalType === 'lose' || goalType === 'gain' || genderSpecific.pregnancy || genderSpecific.breastfeeding;

  let cardIdx = 0;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2.5 mb-1">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display font-bold text-foreground tracking-tight">Your Food Intelligence</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">Based on your profile, here's what to eat and avoid.</p>
      </motion.div>

      {!hasAnything && (
        <motion.div custom={0} variants={stagger} initial="hidden" animate="visible"
          className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm font-semibold text-foreground">No specific restrictions</p>
          <p className="text-xs text-muted-foreground mt-1">Focus on balanced nutrition with variety.</p>
        </motion.div>
      )}

      {/* Condition cards */}
      {activeConditions.map(cond => {
        const rule = CONDITION_RULES[cond];
        const idx = cardIdx++;
        return (
          <motion.div key={cond} custom={idx} variants={stagger} initial="hidden" animate="visible"
            className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{rule.icon}</span>
              <h3 className="text-sm font-semibold text-foreground">{rule.label}</h3>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-destructive/80 uppercase tracking-wider mb-1.5">Avoid / Limit</p>
              <div className="flex flex-wrap gap-1.5">
                {rule.avoid.map(item => (
                  <span key={item} className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-[11px] font-medium">{item}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-primary/80 uppercase tracking-wider mb-1.5">Prefer</p>
              <div className="flex flex-wrap gap-1.5">
                {rule.prefer.map(item => (
                  <span key={item} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium">{item}</span>
                ))}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Skin section */}
      {skinRules && (
        <motion.div custom={cardIdx++} variants={stagger} initial="hidden" animate="visible"
          className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">{SKIN_LABELS[skinConcern] || skinConcern} Skin</h3>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-destructive/80 uppercase tracking-wider mb-1.5">Avoid / Limit</p>
            <div className="flex flex-wrap gap-1.5">
              {skinRules.avoid.map(item => (
                <span key={item} className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-[11px] font-medium">{item}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-primary/80 uppercase tracking-wider mb-1.5">Prefer</p>
            <div className="flex flex-wrap gap-1.5">
              {skinRules.prefer.map(item => (
                <span key={item} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium">{item}</span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Goal section */}
      {(goalType === 'lose' || goalType === 'gain') && (
        <motion.div custom={cardIdx++} variants={stagger} initial="hidden" animate="visible"
          className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{goalType === 'lose' ? 'Weight Loss' : 'Weight Gain'} Tips</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {goalType === 'lose'
              ? 'Prefer high-protein, low-calorie foods. Avoid fried snacks, sugary drinks, and refined carbs. Focus on fibre-rich meals to stay full longer.'
              : 'Prefer nutrient-dense, calorie-rich foods. Add healthy fats (nuts, ghee) and protein (eggs, paneer, chicken). Eat frequently.'}
          </p>
        </motion.div>
      )}

      {/* Pregnancy / Breastfeeding */}
      {(genderSpecific.pregnancy || genderSpecific.breastfeeding) && (
        <motion.div custom={cardIdx++} variants={stagger} initial="hidden" animate="visible"
          className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Baby className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">
              {genderSpecific.pregnancy ? 'Pregnancy' : 'Breastfeeding'} Nutrition
            </h3>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-destructive/80 uppercase tracking-wider mb-1.5">Avoid</p>
            <div className="flex flex-wrap gap-1.5">
              {['Raw fish', 'Alcohol', 'Excess caffeine', 'Unpasteurised dairy'].map(item => (
                <span key={item} className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-[11px] font-medium">{item}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-primary/80 uppercase tracking-wider mb-1.5">Prefer</p>
            <div className="flex flex-wrap gap-1.5">
              {['Folate-rich foods', 'Iron-rich foods', 'Calcium', 'DHA/Omega-3', 'Fresh fruits'].map(item => (
                <span key={item} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium">{item}</span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Monika tip */}
      <motion.div custom={cardIdx} variants={stagger} initial="hidden" animate="visible"
        className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <span className="text-lg shrink-0">🧠</span>
        <p className="text-xs text-foreground leading-relaxed">
          <strong>I'll remember all of this.</strong> When you log meals, scan food, or get suggestions, I'll warn you about conflicts and recommend better options — in real time.
        </p>
      </motion.div>
    </div>
  );
}
