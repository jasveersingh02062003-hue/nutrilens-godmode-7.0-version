import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  missedDate: string;
}

export default function MissedDayPrompt({ open, onClose, missedDate }: Props) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Missed a day? 📝</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Looks like you didn't log meals yesterday. Would you like to quickly add them or skip?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={() => { onClose(); navigate(`/log-food?date=${missedDate}&meal=breakfast`); }}>
            Log Yesterday's Meals
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Skip — move on
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
