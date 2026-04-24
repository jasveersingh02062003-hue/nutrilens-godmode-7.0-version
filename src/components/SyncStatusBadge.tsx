import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CloudOff } from 'lucide-react';
import { count, subscribe, consumePurgeWarning } from '@/lib/offline-outbox';
import { toast } from 'sonner';

/**
 * Compact sync indicator — only visible when there are pending writes
 * or the device is offline. Stays out of the way otherwise.
 */
export default function SyncStatusBadge() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const c = await count();
      if (mounted) setPending(c);
    };
    refresh();
    const unsub = subscribe(refresh);

    const goOnline = () => { setOnline(true); refresh(); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Poll every 5s as a safety net (covers replay completions)
    const poll = setInterval(refresh, 5_000);

    // One-time warning if items were purged
    const warned = consumePurgeWarning();
    if (warned) {
      toast.warning('Some old offline logs could not sync', {
        description: 'Items older than 7 days were removed to keep your data clean.',
        duration: 7_000,
      });
    }

    return () => {
      mounted = false;
      unsub();
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(poll);
    };
  }, []);

  // Hidden when synced + online (the common case)
  const visible = !online || pending > 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
        >
          {!online ? (
            <>
              <CloudOff className="w-3 h-3" />
              <span>Offline</span>
              {pending > 0 && <span>· {pending}</span>}
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Syncing {pending}…</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
