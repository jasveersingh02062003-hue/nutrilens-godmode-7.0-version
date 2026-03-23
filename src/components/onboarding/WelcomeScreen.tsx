import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Smartphone } from 'lucide-react';
import heroImg from '@/assets/hero-nutrition.jpg';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export default function WelcomeScreen({ onGetStarted, onSignIn }: WelcomeScreenProps) {
  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      {/* Hero image — top half with soft fade */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full h-[42vh] flex-shrink-0 overflow-hidden"
      >
        <img
          src={heroImg}
          alt="Fresh vegetables and ingredients"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </motion.div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 pb-8 -mt-4 relative z-10">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2 mb-2"
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-bold text-foreground tracking-tight">
            NutriLens AI
          </span>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-muted-foreground text-sm leading-relaxed mb-8"
        >
          Track smarter. Eat better. Live healthier.
        </motion.p>

        {/* Spacer */}
        <div className="flex-1 min-h-4" />

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3"
        >
          {/* Get Started */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onGetStarted}
            className="w-full py-4 rounded-full bg-primary text-primary-foreground text-base font-bold flex items-center justify-center gap-2 shadow-fab active:scale-[0.97] transition-transform"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </motion.button>

          {/* Sign In */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onSignIn}
            className="w-full py-3.5 rounded-full border border-border text-foreground text-sm font-semibold hover:bg-muted/50 active:scale-[0.97] transition-all"
          >
            Sign In
          </motion.button>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-3 my-5"
        >
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">or continue with</span>
          <div className="flex-1 h-px bg-border" />
        </motion.div>

        {/* Social buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex gap-3"
        >
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onSignIn}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted/50 active:scale-[0.96] transition-all"
          >
            {/* Google icon as inline SVG for color accuracy */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onSignIn}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted/50 active:scale-[0.96] transition-all"
          >
            <Smartphone className="w-4 h-4" />
            Phone
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
