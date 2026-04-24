import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Pause, Play, Plus } from "lucide-react";
import { inr } from "@/lib/admin-metrics";
import { toast } from "sonner";

interface Camp {
  id: string;
  campaign_name: string;
  status: string;
  budget_total: number;
  budget_spent: number;
  start_date: string;
  end_date: string;
  placement_slot: string;
}

export default function BrandCampaigns() {
  const { user } = useAuth();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: members } = await supabase.from("brand_members").select("brand_id").eq("user_id", user.id);
    const ids = (members ?? []).map((m: any) => m.brand_id);
    if (!ids.length) {
      setCamps([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("ad_campaigns")
      .select("id, campaign_name, status, budget_total, budget_spent, start_date, end_date, placement_slot")
      .in("brand_id", ids)
      .order("created_at", { ascending: false });
    setCamps((data ?? []) as Camp[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const toggle = async (c: Camp) => {
    // Brands can pause an active campaign, or resubmit a paused/draft for review.
    // They cannot directly set status='active' — that requires admin approval.
    if (c.status === "active") {
      const { error } = await supabase.from("ad_campaigns").update({ status: "paused" }).eq("id", c.id);
      if (error) return toast.error(error.message);
      toast.success("Campaign paused");
    } else if (c.status === "draft" || c.status === "paused" || c.status === "rejected") {
      const { error } = await supabase.rpc("submit_campaign_for_review", { p_campaign_id: c.id });
      if (error) return toast.error(error.message);
      toast.success("Submitted for review");
    } else {
      toast.info("Awaiting admin review");
      return;
    }
    load();
  };

  if (loading)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Manage your ad campaigns</p>
        </div>
        <Button asChild size="sm">
          <Link to="/brand/new">
            <Plus className="w-4 h-4 mr-1" /> New campaign
          </Link>
        </Button>
      </div>

      <Card className="p-4">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="text-left py-2">Name</th>
              <th className="text-left">Status</th>
              <th className="text-left">Slot</th>
              <th className="text-right">Spent</th>
              <th className="text-right">Budget</th>
              <th className="text-right">Util</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {camps.map((c) => {
              const util = c.budget_total ? Math.round((Number(c.budget_spent) / Number(c.budget_total)) * 100) : 0;
              const exhausted = util >= 100;
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-3 font-medium">{c.campaign_name}</td>
                  <td>
                    <Badge
                      variant={
                        c.status === "active" ? "default" :
                        c.status === "rejected" ? "destructive" :
                        "secondary"
                      }
                      className="text-[10px]"
                    >
                      {c.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="text-xs text-muted-foreground">{c.placement_slot}</td>
                  <td className="text-right tabular-nums">{inr(Number(c.budget_spent))}</td>
                  <td className="text-right tabular-nums">{inr(Number(c.budget_total))}</td>
                  <td className={`text-right tabular-nums ${exhausted ? "text-destructive font-medium" : ""}`}>{util}%</td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggle(c)}
                      disabled={(exhausted && c.status !== "active") || c.status === "pending_review"}
                      title={
                        c.status === "active" ? "Pause" :
                        c.status === "pending_review" ? "Awaiting admin review" :
                        c.status === "rejected" ? "Resubmit for review" :
                        "Submit for review"
                      }
                    >
                      {c.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {!camps.length && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                  No campaigns yet. <Link to="/brand/new" className="text-primary underline">Create your first one</Link>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
