import { Home, BarChart3, Camera, CalendarDays, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const tabs = [
  { path: '/dashboard', icon: Home, label: 'Home' },
  { path: '/progress', icon: BarChart3, label: 'Progress' },
  { path: '/', icon: Camera, label: 'Camera', isCenter: true },
  { path: '/planner', icon: CalendarDays, label: 'Planner' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on market routes — MarketBottomNav takes over
  if (location.pathname.startsWith('/market')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/60 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="grid grid-cols-5 max-w-lg mx-auto h-16 px-1">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;

          if (tab.isCenter) {
            return (
              <button
                key="camera-tab"
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <motion.div
                  className="w-14 h-14 rounded-full bg-primary flex items-center justify-center relative overflow-hidden"
                  whileTap={{ scale: 0.9 }}
                  style={{ boxShadow: '0 8px 24px -4px hsl(var(--primary) / 0.3)' }}
                >
                  <motion.div
                    className="absolute inset-[-2px] rounded-full"
                    style={{
                      background: 'conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--accent)), hsl(var(--primary)))',
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                  />
                  <div className="absolute inset-[2px] rounded-full bg-primary" />
                  <Camera className="w-6 h-6 text-primary-foreground relative z-10" strokeWidth={2.5} />
                </motion.div>
                <span className={`text-[9px] mt-0.5 font-bold ${active ? 'text-primary' : 'text-muted-foreground'}`}>{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-1 min-h-[48px]"
            >
              <motion.div
                animate={active ? { y: -2 } : { y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                whileTap={{ scale: 0.9 }}
              >
                <tab.icon className={`w-5 h-5 ${active ? 'text-primary stroke-[2.5]' : 'text-muted-foreground'}`} />
              </motion.div>
              <span className={`text-[10px] ${active ? 'font-bold text-primary' : 'font-medium text-muted-foreground'}`}>{tab.label}</span>
              {active && (
                <motion.div
                  layoutId="nav-dot"
                  className="w-1 h-1 rounded-full bg-primary -mt-0.5"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
