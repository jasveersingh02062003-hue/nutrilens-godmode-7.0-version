// ============================================
// NutriLens AI – Contextual Tips Card
// ============================================
// Shows proactive, context-aware suggestions on Dashboard.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { getContextualSuggestions, dismissContextTip, type ContextSuggestion } from '@/lib/context-engine';

export default function ContextualTipsCard() {
  const { profile } = useUserProfile();
  const [tips, setTips] = useState<ContextSuggestion[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    setTips(getContextualSuggestions(profile));
  }, [profile]);

  const handleDismiss = (key: string) => {
    dismissContextTip(key);
    setTips(prev => prev.filter(t => t.dismissKey !== key));
  };

  if (tips.length === 0) return null;

  return (
    <div className="space-y-2">
      {tips.map((tip, i) => (
        <AnimatePresence key={tip.dismissKey}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-primary/15 bg-primary/5 px-3.5 py-3"
          >
            <div className="flex items-start gap-2.5">
              <span className="text-base mt-0.5">{tip.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <Lightbulb className="w-3 h-3 text-primary" />
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Smart Tip</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{tip.text}</p>

                {/* Why this tip? */}
                <button
                  onClick={() => setExpandedKey(expandedKey === tip.dismissKey ? null : tip.dismissKey)}
                  className="flex items-center gap-0.5 mt-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                >
                  Why this tip?
                  {expandedKey === tip.dismissKey ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedKey === tip.dismissKey && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="text-[10px] text-muted-foreground leading-relaxed mt-1 overflow-hidden"
                    >
                      {tip.explanation}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={() => handleDismiss(tip.dismissKey)}
                className="shrink-0 w-6 h-6 rounded-full bg-muted/60 flex items-center justify-center"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      ))}
    </div>
  );
}
