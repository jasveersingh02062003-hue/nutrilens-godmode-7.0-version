import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface JournalEntry {
  date: string;
  energy: number;
  bloating: number;
  mood: number;
  notes: string;
}

const STORAGE_KEY = 'nutrilens_body_journal';

function getEntries(): JournalEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveEntry(entry: JournalEntry) {
  const entries = getEntries().filter(e => e.date !== entry.date);
  entries.push(entry);
  // Keep last 30
  const trimmed = entries.slice(-30);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function hasTodayJournal(): boolean {
  const today = new Date().toISOString().split('T')[0];
  return getEntries().some(e => e.date === today);
}

export function getJournalEntries(): JournalEntry[] {
  return getEntries();
}

export default function BodyAwarenessJournal({ open, onClose }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const existing = getEntries().find(e => e.date === today);

  const [energy, setEnergy] = useState(existing?.energy ?? 3);
  const [bloating, setBloating] = useState(existing?.bloating ?? 1);
  const [mood, setMood] = useState(existing?.mood ?? 3);
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const labels = ['😩', '😕', '😐', '🙂', '😊'];

  const handleSave = () => {
    saveEntry({ date: today, energy, bloating, mood, notes });
    toast.success('Journal saved ✨');
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="text-center text-base">🧘 Body Awareness Journal</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 py-4">
          {/* Energy */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">Energy Level</span>
              <span className="text-sm">{labels[energy - 1]}</span>
            </div>
            <Slider value={[energy]} min={1} max={5} step={1} onValueChange={v => setEnergy(v[0])} />
          </div>

          {/* Bloating */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">Bloating</span>
              <span className="text-xs text-muted-foreground">{bloating === 1 ? 'None' : bloating <= 3 ? 'Mild' : 'Severe'}</span>
            </div>
            <Slider value={[bloating]} min={1} max={5} step={1} onValueChange={v => setBloating(v[0])} />
          </div>

          {/* Mood */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">Mood</span>
              <span className="text-sm">{labels[mood - 1]}</span>
            </div>
            <Slider value={[mood]} min={1} max={5} step={1} onValueChange={v => setMood(v[0])} />
          </div>

          {/* Notes */}
          <div>
            <span className="text-xs font-semibold text-foreground block mb-2">Notes (optional)</span>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How do you feel today? Any reactions to specific foods?"
              className="text-sm"
              rows={3}
            />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          Save Journal Entry
        </Button>
      </SheetContent>
    </Sheet>
  );
}
