import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getGreeting } from '@/lib/nutrition';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import type { UserProfile } from '@/lib/store';
import type { WeatherData } from '@/lib/weather-service';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

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

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`relative flex items-center justify-between rounded-2xl px-1 py-1 overflow-hidden`}
    >
      {/* Ambient time-of-day gradient */}
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} pointer-events-none rounded-2xl`} />

      <div className="flex items-center gap-3 relative z-10">
        <button onClick={() => navigate('/profile')} className="relative w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
          <span className="text-sm font-bold text-primary">{(profile.name || 'U')[0].toUpperCase()}</span>
          {/* Pulsing ring */}
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
          className="w-10 h-10 rounded-xl glass-card flex items-center justify-center relative"
        >
          <Bell className="w-4.5 h-4.5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-coral" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-coral animate-notification-pulse" />
        </motion.button>
      </div>
    </motion.div>
  );
}
