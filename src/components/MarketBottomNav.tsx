import { Store, LayoutGrid, Flame, Scale, ClipboardList } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

const marketTabs = [
  { path: '/market', icon: Store, label: 'Shop', exact: true },
  { path: '/market/categories', icon: LayoutGrid, label: 'Categories' },
  { path: '/market/deals', icon: Flame, label: 'Deals' },
  { path: '/market/compare', icon: Scale, label: 'Compare' },
  { path: '/market/list', icon: ClipboardList, label: 'My List' },
];

export default function MarketBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  if (!location.pathname.startsWith('/market')) return null;

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-2xl border-t border-border/40 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="grid grid-cols-5 max-w-lg mx-auto h-16 px-1">
        {marketTabs.map((tab) => {
          const active = tab.exact
            ? location.pathname === tab.path
            : location.pathname.startsWith(tab.path);

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center justify-center gap-0.5 min-h-[48px]"
            >
              <motion.div
                animate={active && !prefersReducedMotion ? { y: -3, scale: 1.1 } : { y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.85 }}
                className="relative"
              >
                <tab.icon className={`w-5 h-5 transition-colors duration-200 ${active ? 'text-primary stroke-[2.5]' : 'text-muted-foreground'}`} />
                {active && (
                  <motion.div
                    layoutId="market-nav-glow"
                    className="absolute inset-0 -m-1.5 rounded-full bg-primary/10 blur-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.div>
              <span className={`text-[10px] transition-colors duration-200 ${active ? 'font-bold text-primary' : 'font-medium text-muted-foreground'}`}>
                {tab.label}
              </span>
              {active && (
                <motion.div
                  layoutId="market-nav-dot"
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
