import { motion, AnimatePresence } from 'framer-motion';

interface MonikaGuideProps {
  message: string;
  mood?: 'happy' | 'thinking' | 'excited' | 'concerned' | 'celebrating' | 'waving';
  compact?: boolean;
}

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  thinking: '🤔',
  excited: '✨',
  concerned: '🫶',
  celebrating: '🥳',
  waving: '👋',
};

export default function MonikaGuide({ message, mood = 'happy', compact = false }: MonikaGuideProps) {
  const emoji = MOOD_EMOJI[mood];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={message}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className={`flex items-start gap-3.5 ${compact ? 'mb-3' : 'mb-6'}`}
      >
        {/* Premium Avatar */}
        <motion.div
          animate={
            mood === 'celebrating'
              ? { rotate: [0, -8, 8, -8, 0], scale: [1, 1.08, 1] }
              : mood === 'waving'
              ? { rotate: [0, 12, -4, 12, 0] }
              : { scale: [1, 1.02, 1] }
          }
          transition={{
            repeat: mood === 'celebrating' || mood === 'waving' ? 2 : Infinity,
            duration: mood === 'celebrating' ? 0.5 : 3,
            ease: 'easeInOut',
          }}
          className="shrink-0 w-11 h-11 rounded-full bg-card flex items-center justify-center text-lg border border-border shadow-sm"
        >
          {emoji}
        </motion.div>

        {/* Clean Speech Bubble */}
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08 }}
          className="relative flex-1 bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm"
        >
          <p className="text-[13px] text-foreground leading-relaxed relative z-10">
            <span className="font-bold text-foreground tracking-tight">Monika</span>
            <span className="text-border mx-1.5">·</span>
            <span className="text-muted-foreground">{message}</span>
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Step-specific messages for Monika
export type MonikaMood = MonikaGuideProps['mood'];
export const MONIKA_MESSAGES: Record<string, { message: string; mood: MonikaGuideProps['mood'] }> = {
  tutorial: { message: "Hi! I'm Monika, your AI nutrition partner. Let me show you around.", mood: 'waving' },
  welcome: { message: "Ready to begin your wellness journey?", mood: 'excited' },
  name: { message: "What should I call you?", mood: 'happy' },
  gender: { message: "This helps me calculate your metabolism accurately.", mood: 'thinking' },
  occupation: { message: "Your daily activity matters more than you think.", mood: 'thinking' },
  jobType: { message: "Physical demands of your job affect calories burnt.", mood: 'thinking' },
  workActivity: { message: "Almost done with the work stuff!", mood: 'happy' },
  exercise: { message: "Exercise is wonderful — but no pressure. Every bit counts.", mood: 'excited' },
  sleep: { message: "Sleep is essential for weight management.", mood: 'thinking' },
  stress: { message: "Stress eating is real — I'll help you manage it.", mood: 'concerned' },
  cooking: { message: "Home cooking gives you more control over nutrition.", mood: 'happy' },
  eatingOut: { message: "No judgment — I'll help track restaurant meals too.", mood: 'happy' },
  caffeine: { message: "Everything in moderation — including caffeine.", mood: 'happy' },
  activity: { message: "This determines your calorie multiplier.", mood: 'thinking' },
  measurements: { message: "These numbers help calculate your BMI and metabolism.", mood: 'thinking' },
  dob: { message: "Age affects your Basal Metabolic Rate.", mood: 'thinking' },
  goal: { message: "What are we working towards? I'll build around this.", mood: 'excited' },
  targetWeight: { message: "A realistic target makes all the difference.", mood: 'thinking' },
  goalSpeed: { message: "Consistency over speed — but it's your call.", mood: 'happy' },
  dietary: { message: "No wrong answers — eat what makes you feel good.", mood: 'happy' },
  health: { message: "This stays private. It helps me personalize your plan.", mood: 'concerned' },
  diabetesDetails: { message: "I'll tailor your meals to help manage blood sugar.", mood: 'concerned' },
  womenHealth: { message: "Hormonal health is important for nutrition.", mood: 'concerned' },
  pcosDetails: { message: "PCOS management through nutrition makes a difference.", mood: 'concerned' },
  hypertensionDetails: { message: "I'll watch out for high-sodium foods.", mood: 'concerned' },
  lactoseDetails: { message: "I'll suggest great dairy alternatives.", mood: 'happy' },
  healthGoals: { message: "Pick what matters most — I'll prioritize these.", mood: 'excited' },
  skinConcerns: { message: "Your skin reflects what you eat — let's nourish it from within.", mood: 'happy' },
  menHealth: { message: "Let's make sure your nutrition supports your health.", mood: 'concerned' },
  medications: { message: "Optional — but helps me avoid nutrient conflicts.", mood: 'thinking' },
  mealTimes: { message: "I'll send gentle reminders at these times.", mood: 'happy' },
  water: { message: "Hydration is the #1 health hack.", mood: 'excited' },
  summary: { message: "Your personalized plan looks amazing. Ready?", mood: 'celebrating' },
};

// Meal Planner onboarding messages
export const MEAL_PLANNER_MONIKA: Record<string, { message: string; mood: MonikaMood }> = {
  welcome: { message: "Let's build your perfect meal plan together!", mood: 'excited' },
  goal: { message: "What are we cooking towards? Your goal shapes everything.", mood: 'thinking' },
  motivations: { message: "Understanding your 'why' helps me keep you motivated.", mood: 'happy' },
  pace: { message: "Slow & steady or full speed? Both are valid.", mood: 'thinking' },
  experience: { message: "No judgment — everyone starts somewhere.", mood: 'happy' },
  challenges: { message: "Knowing your struggles helps me plan around them.", mood: 'concerned' },
  activity: { message: "Your activity level determines calorie needs.", mood: 'thinking' },
  exercise: { message: "Exercise + good food = unstoppable.", mood: 'excited' },
  sleep: { message: "Good sleep = better food choices.", mood: 'thinking' },
  stress: { message: "I'll suggest comfort foods that are actually healthy.", mood: 'concerned' },
  dietary: { message: "Your preferences, your plan — no compromises.", mood: 'happy' },
  medical: { message: "Safety first! I'll keep these in mind.", mood: 'concerned' },
  allergies: { message: "I'll make sure nothing sneaks into your meals.", mood: 'concerned' },
  cuisines: { message: "Let's pick your favourite cuisines!", mood: 'excited' },
  cooking: { message: "Whether chef or microwave master — I've got you.", mood: 'happy' },
  cookTime: { message: "Time is precious — I'll respect yours.", mood: 'thinking' },
  equipment: { message: "Let me know what you're working with.", mood: 'happy' },
  eatingOut: { message: "Eating out is fine — I'll plan around it.", mood: 'happy' },
  snacking: { message: "Snacking is normal! Let's make it smart.", mood: 'happy' },
  mealsPerDay: { message: "Almost there! How many meals should I plan?", mood: 'excited' },
  summary: { message: "Your meal plan profile is ready!", mood: 'celebrating' },
};

// Budget Planner onboarding messages
export const BUDGET_PLANNER_MONIKA: Record<string, { message: string; mood: MonikaMood }> = {
  choose: { message: "Let's figure out your food budget. Eating well doesn't have to break the bank.", mood: 'excited' },
  manual: { message: "You know your numbers best! Set what feels right.", mood: 'happy' },
  ai: { message: "Answer a few quick Qs and I'll suggest a smart budget.", mood: 'thinking' },
  'ai-result': { message: "Here's what I think works for you! Feel free to tweak it.", mood: 'celebrating' },
};
