import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Sparkles } from 'lucide-react';
import heroImg from '@/assets/hero-nutrition.jpg';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export default function WelcomeScreen({ onGetStarted, onSignIn }: WelcomeScreenProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background image with gradient overlay */}
      <div className="absolute inset-0">
        <img src={heroImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen px-6 pb-8 pt-12">
        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2"
        >
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-white/90 font-display text-lg font-bold tracking-tight">NutriLens</span>
        </motion.div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Glassmorphism insight card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
          className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-white/60 text-[10px] uppercase tracking-widest font-semibold">AI Insight</p>
              <p className="text-white text-sm font-semibold mt-0.5">Average Indian thali: 650 kcal</p>
              <p className="text-white/50 text-[11px] mt-0.5">Snap a photo to decode your meal instantly</p>
            </div>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <h1 className="text-[2rem] leading-[1.15] font-display font-bold text-white tracking-tight">
            Your Food,{' '}
            <span className="text-primary">Decoded</span>{' '}
            by AI
          </h1>
          <p className="text-white/60 text-sm mt-3 leading-relaxed max-w-[300px]">
            Snap any meal. Get instant nutrition insights powered by AI. Track calories, macros, and build healthier habits.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onGetStarted}
            className="w-full py-4 rounded-full bg-primary text-primary-foreground text-base font-bold flex items-center justify-center gap-2 shadow-lg"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onSignIn}
            className="w-full py-3 text-center text-white/50 text-sm font-medium hover:text-white/80 transition-colors"
          >
            I already have an account
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
