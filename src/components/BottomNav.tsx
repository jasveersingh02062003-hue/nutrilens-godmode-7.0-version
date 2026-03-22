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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16 px-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;

          if (tab.isCenter) {
            return (
              <button
                key="camera-tab"
                onClick={() => navigate(tab.path)}
                className="relative -mt-5 flex flex-col items-center"
              >
                <motion.div
                  className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-fab"
                  whileTap={{ scale: 0.9 }}
                  animate={active ? { boxShadow: ['0 0 0 0 hsl(152 55% 42% / 0.4)', '0 0 0 10px hsl(152 55% 42% / 0)', '0 0 0 0 hsl(152 55% 42% / 0.4)'] } : {}}
                  transition={active ? { repeat: Infinity, duration: 2 } : {}}
                >
                  <Camera className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} />
                </motion.div>
                <span className={`text-[9px] mt-0.5 font-bold ${active ? 'text-primary' : 'text-muted-foreground'}`}>{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <tab.icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
