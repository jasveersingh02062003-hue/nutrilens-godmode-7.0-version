import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useNavigate } from 'react-router-dom';
import { Store, User, Bell, Settings, TrendingUp, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MENU_ITEMS = [
  { icon: Store, label: 'Smart Market', path: '/market', badge: 'NEW', color: 'text-secondary' },
  { icon: TrendingUp, label: 'Progress & Reports', path: '/progress', color: 'text-primary' },
  { icon: User, label: 'Profile & Goals', path: '/profile', color: 'text-primary' },
  { icon: Bell, label: 'Notifications', path: null, color: 'text-muted-foreground', comingSoon: true },
  { icon: Settings, label: 'Settings', path: '/profile', color: 'text-muted-foreground' },
];

export default function DashboardSidebar({ open, onOpenChange }: Props) {
  const navigate = useNavigate();

  const handleNav = (path: string | null) => {
    if (!path) return;
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-72 p-0 bg-card border-l border-border">
        <SheetHeader className="p-5 pb-3 border-b border-border">
          <SheetTitle className="text-base font-bold text-foreground">Menu</SheetTitle>
        </SheetHeader>

        <nav className="p-3 space-y-1">
          {MENU_ITEMS.map((item, i) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleNav(item.path)}
              disabled={item.comingSoon}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors
                ${item.comingSoon ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted active:bg-muted/80'}`}
            >
              <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center`}>
                <item.icon className={`w-4.5 h-4.5 ${item.color}`} />
              </div>
              <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
              {item.badge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-secondary-foreground">
                  {item.badge}
                </span>
              )}
              {item.comingSoon && (
                <span className="text-[10px] text-muted-foreground">Soon</span>
              )}
            </motion.button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-0 right-0 px-5">
          <div className="p-3 rounded-xl bg-muted/50 border border-border">
            <p className="text-[11px] text-muted-foreground text-center">
              🏪 Smart Market helps you find the best protein value for your money
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
