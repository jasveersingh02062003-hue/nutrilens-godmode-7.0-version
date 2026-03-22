import { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { evaluateCoach, CoachMessage, CoachAction, dismissCoachMessage, recordCoachFeedback, getCoachSettings } from '@/lib/coach';
import { getProfile, getDailyLog, addWater } from '@/lib/store';

export default function CoachCard() {
  const navigate = useNavigate();
  const [message, setMessage] = useState<CoachMessage | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const evaluate = useCallback(() => {
    const settings = getCoachSettings();
    if (!settings.enabled) { setMessage(null); return; }
    const profile = getProfile();
    if (!profile) return;
    const log = getDailyLog();
    const msg = evaluateCoach(profile, log);
    if (msg) {
      setMessage(msg);
      setDismissed(false);
      setFeedbackGiven(false);
    }
  }, []);

  useEffect(() => { evaluate(); }, [evaluate]);

  useEffect(() => {
    const handler = () => evaluate();
    window.addEventListener('storage', handler);
    const interval = setInterval(handler, 60000);
    return () => {
      window.removeEventListener('storage', handler);
      clearInterval(interval);
    };
  }, [evaluate]);

  const handleDismiss = () => {
    if (message) dismissCoachMessage(message.id);
    setDismissed(true);
  };

  const handleFeedback = (reaction: 'positive' | 'negative') => {
    if (message) recordCoachFeedback(message.id, reaction);
    setFeedbackGiven(true);
    if (reaction === 'positive') {
      setTimeout(() => setDismissed(true), 800);
    }
  };

  const handleAction = (action: CoachAction) => {
    if (action.addWater) {
      addWater();
      window.dispatchEvent(new Event('storage'));
      setDismissed(true);
      return;
    }
    if (action.logMeal) {
      navigate(`/log?meal=${action.logMeal}`);
      return;
    }
    if (action.route) {
      navigate(action.route);
      return;
    }
  };

  if (!message || dismissed) return null;

  const toneColors: Record<string, string> = {
    urgent: 'bg-destructive',
    celebratory: 'bg-primary',
    encouraging: 'bg-accent',
    neutral: 'bg-primary',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="card-elevated p-4 relative overflow-hidden"
      >
        {/* Accent stripe */}
        <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${toneColors[message.tone]}`} />

        <div className="flex items-start gap-3 pl-2">
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-lg">{message.icon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Coach</span>
              {message.tone === 'urgent' && (
                <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">Urgent</span>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug">{message.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{message.body}</p>

            {/* Action Buttons */}
            {message.actions && message.actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {message.actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleAction(action)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors"
                  >
                    <span className="text-xs">{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Feedback */}
            {!feedbackGiven && (
              <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground mr-1">Helpful?</span>
                <button
                  onClick={() => handleFeedback('positive')}
                  className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center hover:bg-primary/15 transition-colors"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleFeedback('negative')}
                  className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center hover:bg-destructive/15 transition-colors"
                >
                  <ThumbsDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            )}
            {feedbackGiven && (
              <p className="text-[10px] text-muted-foreground mt-2 italic">Thanks for your feedback!</p>
            )}
          </div>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
