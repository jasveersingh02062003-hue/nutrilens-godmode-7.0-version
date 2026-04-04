import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Share2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { MealEntry, getDailyLog, saveDailyLog } from '@/lib/store';
import { getSourceEmoji, getSourceLabel } from '@/lib/context-learning';

const COOKING_LABELS: Record<string, string> = {
  fried: '🍟 Fried', air_fried: '🔥 Air Fried', grilled: '🍖 Grilled',
  baked: '🍪 Baked', boiled_steamed: '💧 Boiled/Steamed', sauteed: '🍳 Sautéed', raw: '🥕 Raw',
};

interface Props {
  open: boolean;
  date: string;
  mealId: string;
  onClose: () => void;
  onChanged: () => void;
}

export default function FullScreenMemory({ open, date, mealId, onClose, onChanged }: Props) {
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');

  if (!open) return null;

  const log = getDailyLog(date);
  const mealsWithPhotos = log.meals.filter(m => m.photo);
  const currentIndex = mealsWithPhotos.findIndex(m => m.id === mealId);
  const meal = currentIndex >= 0 ? mealsWithPhotos[currentIndex] : null;

  if (!meal || !meal.photo) return null;

  const foodNames = meal.items.map(i => i.name).join(', ');
  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const startEditCaption = () => {
    setCaptionDraft(meal.caption || '');
    setEditingCaption(true);
  };

  const saveCaption = () => {
    const updatedLog = getDailyLog(date);
    updatedLog.meals = updatedLog.meals.map(m =>
      m.id === meal.id ? { ...m, caption: captionDraft.trim() || null } : m
    );
    saveDailyLog(updatedLog);
    setEditingCaption(false);
    onChanged();
  };

  const handleDelete = () => {
    if (!confirm('Remove this meal?')) return;
    const updatedLog = getDailyLog(date);
    updatedLog.meals = updatedLog.meals.filter(m => m.id !== meal.id);
    saveDailyLog(updatedLog);
    onChanged();
    onClose();
  };

  const handleShare = async () => {
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = async () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Add overlay
      const gradient = ctx.createLinearGradient(0, img.height * 0.6, 0, img.height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, img.width, img.height);

      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.round(img.width / 20)}px sans-serif`;
      ctx.fillText(foodNames, 20, img.height - 60);
      ctx.font = `${Math.round(img.width / 30)}px sans-serif`;
      ctx.fillText(`${formattedDate} · ${meal.totalCalories} kcal`, 20, img.height - 25);

      canvas.toBlob(async (blob) => {
        if (blob && navigator.share) {
          const file = new File([blob], 'food-memory.jpg', { type: 'image/jpeg' });
          try {
            await navigator.share({ files: [file], title: 'Food Memory', text: foodNames });
          } catch {}
        }
      }, 'image/jpeg', 0.9);
    };
    img.src = meal.photo!;
  };

  const navigate = (dir: -1 | 1) => {
    const newIndex = currentIndex + dir;
    if (newIndex >= 0 && newIndex < mealsWithPhotos.length) {
      // Re-render with new meal - parent should handle this
      // For now we just close & reopen logic would be complex
      // Simple approach: update URL params or use state
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-foreground/95"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="absolute inset-0 flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between p-4 z-10">
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-background/20 backdrop-blur flex items-center justify-center">
              <X className="w-4 h-4 text-primary-foreground" />
            </button>
            <div className="flex gap-2">
              <button onClick={handleShare} className="w-9 h-9 rounded-full bg-background/20 backdrop-blur flex items-center justify-center">
                <Share2 className="w-4 h-4 text-primary-foreground" />
              </button>
              <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-destructive/20 backdrop-blur flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          </div>

          {/* Photo */}
          <div className="flex-1 flex items-center justify-center px-4 relative">
            <img
              src={meal.photo!}
              alt={foodNames}
              className="max-w-full max-h-full rounded-2xl object-contain"
            />
            {currentIndex > 0 && (
              <button onClick={() => navigate(-1)} className="absolute left-2 w-8 h-8 rounded-full bg-background/20 backdrop-blur flex items-center justify-center">
                <ChevronLeft className="w-4 h-4 text-primary-foreground" />
              </button>
            )}
            {currentIndex < mealsWithPhotos.length - 1 && (
              <button onClick={() => navigate(1)} className="absolute right-2 w-8 h-8 rounded-full bg-background/20 backdrop-blur flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-primary-foreground" />
              </button>
            )}
          </div>

          {/* Info overlay */}
          <div className="p-5 space-y-2">
            <h3 className="text-base font-bold text-primary-foreground">{foodNames}</h3>
            <p className="text-xs text-primary-foreground/70">
              {formattedDate} · {meal.time}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {meal.source?.category && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-background/20 text-primary-foreground font-medium">
                  {getSourceEmoji(meal.source.category)} {getSourceLabel(meal.source.category)}
                </span>
              )}
              {meal.cookingMethod && COOKING_LABELS[meal.cookingMethod] && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-background/20 text-primary-foreground font-medium">
                  {COOKING_LABELS[meal.cookingMethod]}
                </span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-background/20 text-primary-foreground font-medium">
                🔥 {meal.totalCalories} kcal
              </span>
            </div>

            {/* Caption */}
            {editingCaption ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={captionDraft}
                  onChange={e => setCaptionDraft(e.target.value)}
                  placeholder="Add a memory note..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-background/20 text-primary-foreground text-xs placeholder:text-primary-foreground/40 outline-none"
                  onKeyDown={e => e.key === 'Enter' && saveCaption()}
                />
                <button onClick={saveCaption} className="text-xs font-bold text-primary">Save</button>
              </div>
            ) : (
              <button
                onClick={startEditCaption}
                className="flex items-center gap-1.5 text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                {meal.caption || 'Add a memory note...'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
