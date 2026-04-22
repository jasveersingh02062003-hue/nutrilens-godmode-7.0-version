import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Sticky top banner shown whenever the browser reports the device is offline.
 * Pure UI — does not touch the service worker / caching strategy.
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground"
        >
          <div className="max-w-lg mx-auto flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold">
            <WifiOff className="w-3.5 h-3.5" />
            <span>You're offline. Some features may not work.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
