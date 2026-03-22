import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import MonikaChatScreen from './MonikaChatScreen';

interface MonikaFabProps {
  variant?: 'default' | 'camera';
  onDashboardRefresh?: () => void;
}

export default function MonikaFab({ variant = 'default', onDashboardRefresh }: MonikaFabProps) {
  const [open, setOpen] = useState(false);

  const isCamera = variant === 'camera';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`${isCamera ? '' : 'fixed bottom-20 right-4 z-40'} w-11 h-11 rounded-2xl bg-violet/90 backdrop-blur-sm text-violet-foreground flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-95`}
      >
        <Sparkles className="w-4.5 h-4.5" />
      </button>

      <MonikaChatScreen
        open={open}
        onClose={() => setOpen(false)}
        onDashboardRefresh={onDashboardRefresh}
      />
    </>
  );
}
