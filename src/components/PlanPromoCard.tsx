import { motion } from 'framer-motion';
import { Sparkles, ChevronRight } from 'lucide-react';
import { isPlanActive } from '@/lib/event-plan-service';
import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import SpecialPlansTab from '@/components/SpecialPlansTab';

export default function PlanPromoCard() {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isPlanActive()) return null;

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setSheetOpen(true)}
        className="w-full rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10 p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">🔥 Transform in 21 days</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Celebrity plans, sugar cut, gym programs — explore →</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </motion.button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[90vh] overflow-y-auto p-0">
          <div className="p-4">
            <SpecialPlansTab />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
