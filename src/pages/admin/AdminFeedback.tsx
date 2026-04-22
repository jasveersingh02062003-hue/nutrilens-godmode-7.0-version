import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check } from 'lucide-react';
import { logAdminAction } from '@/lib/audit';
import { toast } from 'sonner';

interface FeedbackRow {
  id: string;
  user_id: string;
  message: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

export default function AdminFeedback() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('feedback')
      .select('id, user_id, message, status, created_at, resolved_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows((data ?? []) as FeedbackRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resolve = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase
      .from('feedback')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: session?.user?.id,
      })
      .eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAdminAction({ action: 'feedback_resolved', target_table: 'feedback', metadata: { id } });
    toast.success('Marked as resolved');
    load();
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Feedback</h1>
      <p className="text-sm text-muted-foreground mb-6">{rows.length} entries</p>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={r.status === 'open' ? 'default' : 'secondary'} className="text-[10px]">
                      {r.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {r.user_id.slice(0, 8)}…
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{r.message}</p>
                </div>
                {r.status === 'open' && (
                  <Button size="sm" variant="outline" onClick={() => resolve(r.id)}>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Resolve
                  </Button>
                )}
              </div>
            </Card>
          ))}
          {rows.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground text-sm">No feedback yet</Card>
          )}
        </div>
      )}
    </div>
  );
}
