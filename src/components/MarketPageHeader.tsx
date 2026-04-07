import { ArrowLeft, Store, MapPin, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MarketPageHeaderProps {
  title?: string;
  city?: string;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
}

export default function MarketPageHeader({
  title = 'Smart Market',
  city,
  showSearch = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
}: MarketPageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate('/dashboard')} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground flex items-center gap-2">
            <Store className="w-4.5 h-4.5 text-primary" /> {title}
          </h1>
          {city && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{city}</span>
            </div>
          )}
        </div>
      </div>

      {showSearch && onSearchChange && (
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-none outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
