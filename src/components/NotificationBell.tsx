import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  audience: 'user' | 'admin' | 'brand';
}

export default function NotificationBell({ audience }: Props) {
  const { items, unreadCount, markRead, markAllRead } = useNotifications(audience);
  const navigate = useNavigate();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] tabular-nums"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">You're all caught up.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      if (!n.is_read) markRead(n.id);
                      if (n.link_url) navigate(n.link_url);
                    }}
                    className={`w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors ${
                      n.is_read ? '' : 'bg-primary/5'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
