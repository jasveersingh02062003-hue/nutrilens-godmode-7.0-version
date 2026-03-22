import { Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MemoryArchiveEntry() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/food-archive')}
      className="w-full card-elevated p-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
    >
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Archive className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-xs font-bold text-foreground">📸 Food Archive</p>
        <p className="text-[10px] text-muted-foreground">Browse all your meal memories</p>
      </div>
      <span className="text-muted-foreground text-xs">→</span>
    </button>
  );
}
