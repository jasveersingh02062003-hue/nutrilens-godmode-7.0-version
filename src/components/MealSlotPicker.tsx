import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { motion } from 'framer-motion';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: MealType;
  onSelect: (type: MealType) => void;
}

const SLOTS: { type: MealType; emoji: string; label: string; hint: string }[] = [
  { type: 'breakfast', emoji: '🌅', label: 'Breakfast', hint: '5 AM – 11 AM' },
  { type: 'lunch', emoji: '☀️', label: 'Lunch', hint: '11 AM – 4 PM' },
  { type: 'snack', emoji: '🍿', label: 'Snack', hint: '4 PM – 6 PM' },
  { type: 'dinner', emoji: '🌙', label: 'Dinner', hint: '6 PM – 10 PM' },
];

export default function MealSlotPicker({ open, onOpenChange, selected, onSelect }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-10">
        <SheetHeader>
          <SheetTitle className="text-center text-base">Add to which meal?</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-3 mt-4 px-1">
          {SLOTS.map((slot, i) => (
            <motion.button
              key={slot.type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelect(slot.type)}
              className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                selected === slot.type
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <span className="text-2xl">{slot.emoji}</span>
              <span className="font-semibold text-sm text-foreground">{slot.label}</span>
              <span className="text-[10px] text-muted-foreground">{slot.hint}</span>
            </motion.button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
