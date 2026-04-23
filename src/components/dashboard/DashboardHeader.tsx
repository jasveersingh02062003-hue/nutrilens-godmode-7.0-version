import { Menu, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGreeting } from '@/lib/nutrition';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import DashboardSidebar from '@/components/DashboardSidebar';
import UpgradeModal from '@/components/UpgradeModal';
import type { UserProfile } from '@/lib/store';
import type { WeatherData } from '@/lib/weather-service';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { isTrialActive, getTrialDaysRemaining, onPlanChange } from '@/lib/subscription-service';

interface Props {
  profile: UserProfile;
  weather: WeatherData | null;
}

function getTimeGradient() {
  const h = new Date().getHours();
  if (h >= 5 && h < 8) return 'from-amber-500/10 via-orange-400/5 to-transparent';
  if (h >= 8 && h < 12) return 'from-yellow-400/8 via-emerald-400/5 to-transparent';
  if (h >= 12 && h < 17) return 'from-sky-400/8 via-blue-400/5 to-transparent';
  if (h >= 17 && h < 20) return 'from-orange-500/10 via-rose-400/5 to-transparent';
  return 'from-indigo-500/8 via-violet-500/5 to-transparent';
}

export default function DashboardHeader({ profile, weather }: Props) {
  const navigate = useNavigate();
  const gradient = useMemo(() => getTimeGradient(), []);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Subscribe to plan changes so the trial banner re-renders when status flips.
  const [, forceTick] = useState(0);
  useEffect(() => onPlanChange(() => forceTick(t => t + 1)), []);

  const trialOn = isTrialActive();
  const trialDaysLeft = trialOn ? getTrialDaysRemaining() : 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`relative flex items-center justify-between rounded-2xl px-1 py-1 overflow-hidden`}
      >
        {/* Ambient time-of-day gradient */}
        <div className={`absolute inset-0 bg-gradient-to-r ${gradient} pointer-events-none rounded-2xl`} />

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => navigate('/profile')}
            aria-label="Open profile"
            className="relative w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden"
          >
            <span className="text-sm font-bold text-primary">{(profile.name || 'U')[0].toUpperCase()}</span>
            <span className="absolute inset-0 rounded-xl border-2 border-primary/40 animate-notification-pulse pointer-events-none" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 32, delay: 0.1 }}
                className="text-sm font-bold text-foreground"
              >
                {getGreeting()}, {profile.name || 'there'}
              </motion.p>
              <SubscriptionBadge />
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-[11px] text-muted-foreground"
            >
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </motion.p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          {weather ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.15 }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl glass-card"
            >
              <span className="text-sm">{weather.icon}</span>
              <span className="text-xs font-semibold text-foreground">{weather.temperature}°</span>
            </motion.div>
          ) : (
            <div className="w-16 h-8 rounded-xl bg-muted animate-pulse" />
          )}
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.2 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="w-10 h-10 rounded-xl glass-card flex items-center justify-center relative"
          >
            <Menu className="w-4.5 h-4.5 text-muted-foreground" />
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {trialOn && (
          <motion.button
            key="trial-banner"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            onClick={() => setUpgradeOpen(true)}
            className="mt-2 w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/15 via-primary/10 to-accent/10 border border-primary/20 active:scale-[0.99] transition-transform"
            aria-label="View upgrade options"
          >
            <span className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground truncate">
                {trialDaysLeft <= 1
                  ? 'Last day of your Pro trial'
                  : `${trialDaysLeft} days left in your Pro trial`}
              </span>
            </span>
            <span className="text-[11px] font-bold text-primary shrink-0">Upgrade →</span>
          </motion.button>
        )}
      </AnimatePresence>

      <DashboardSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
