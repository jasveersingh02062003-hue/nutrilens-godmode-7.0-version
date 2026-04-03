import { scopedGet, scopedSet } from '@/lib/scoped-storage';
import { ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { dismissDropOff } from '@/lib/drop-off-defense';
import { applyHardReset, dismissHardBoundary } from '@/lib/hard-boundary';
import { toast } from 'sonner';
import AdjustmentExplanationModal from '@/components/AdjustmentExplanationModal';
import MorningRecoveryPrompt from '@/components/MorningRecoveryPrompt';
import SupplementLogSheet from '@/components/SupplementLogSheet';
import SupplementEditModal from '@/components/SupplementEditModal';
import PlanCompletionModal from '@/components/PlanCompletionModal';
import PostEventFeedbackModal from '@/components/PostEventFeedbackModal';
import EventPlanConfigSheet from '@/components/EventPlanConfigSheet';
import WeeklyWeightCheckIn from '@/components/WeeklyWeightCheckIn';
import type { SupplementEntry } from '@/lib/store';
import { useNavigate } from 'react-router-dom';

interface Props {
  whyModalOpen: boolean;
  setWhyModalOpen: (v: boolean) => void;
  missedPromptOpen: boolean;
  setMissedPromptOpen: (v: boolean) => void;
  missedDate: string;
  dropOffModal: { detected: boolean; daysMissed: number; message: string } | null;
  setDropOffModal: (v: any) => void;
  hardBoundaryModal: { weeklySurplus: number; message: string; suggestion: string } | null;
  setHardBoundaryModal: (v: any) => void;
  showPlanComplete: boolean;
  setShowPlanComplete: (v: boolean) => void;
  expiredEventPlan: any;
  showEventFeedback: boolean;
  setShowEventFeedback: (v: boolean) => void;
  eventExtendSheet: boolean;
  setEventExtendSheet: (v: boolean) => void;
  showPlannerModal: boolean;
  setShowPlannerModal: (v: boolean) => void;
  plannerDismissKey: string;
  sheetOpen: boolean;
  setSheetOpen: (v: boolean) => void;
  editModalOpen: boolean;
  setEditModalOpen: (v: boolean) => void;
  selectedSupplement: SupplementEntry | null;
  editingSupplement: SupplementEntry | null;
  setEditingSupplement: (v: SupplementEntry | null) => void;
  handleEditSupplement: (s: SupplementEntry) => void;
  refreshLog: () => void;
  refreshProfile: () => void;
  defaultWeight: number;
}

export default function DashboardModals({
  whyModalOpen, setWhyModalOpen,
  missedPromptOpen, setMissedPromptOpen, missedDate,
  dropOffModal, setDropOffModal,
  hardBoundaryModal, setHardBoundaryModal,
  showPlanComplete, setShowPlanComplete,
  expiredEventPlan, showEventFeedback, setShowEventFeedback,
  eventExtendSheet, setEventExtendSheet,
  showPlannerModal, setShowPlannerModal, plannerDismissKey,
  sheetOpen, setSheetOpen, editModalOpen, setEditModalOpen,
  selectedSupplement, editingSupplement, setEditingSupplement,
  handleEditSupplement, refreshLog, refreshProfile, defaultWeight,
}: Props) {
  const navigate = useNavigate();

  return (
    <>
      <WeeklyWeightCheckIn defaultWeight={defaultWeight} onDone={refreshLog} />
      <AdjustmentExplanationModal open={whyModalOpen} onClose={() => setWhyModalOpen(false)} />
      <MorningRecoveryPrompt open={missedPromptOpen} onClose={() => setMissedPromptOpen(false)} missedDate={missedDate} />

      {/* Drop-Off Defense Modal */}
      <Dialog open={!!dropOffModal} onOpenChange={(v) => !v && setDropOffModal(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span>👋</span> Welcome Back!
            </DialogTitle>
            <DialogDescription className="text-sm">
              {dropOffModal?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => { dismissDropOff(); setDropOffModal(null); }}>
              Dismiss
            </Button>
            <Button className="flex-1" onClick={() => { dismissDropOff(); setDropOffModal(null); refreshLog(); toast.success('Plan restarted! Let\'s go! 💪'); }}>
              🚀 Restart
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hard Boundary Alert Modal */}
      <Dialog open={!!hardBoundaryModal} onOpenChange={(v) => !v && setHardBoundaryModal(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="w-4 h-4 text-destructive" /> Weekly Alert
            </DialogTitle>
            <DialogDescription className="text-sm">
              {hardBoundaryModal?.message}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{hardBoundaryModal?.suggestion}</p>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => { dismissHardBoundary(); setHardBoundaryModal(null); }}>
              Not now
            </Button>
            <Button className="flex-1" onClick={() => { applyHardReset(); setHardBoundaryModal(null); toast.success('Plan reset for tomorrow — 15% lighter day ahead'); refreshProfile(); }}>
              Reset Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplement Sheets */}
      <SupplementLogSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingSupplement(null); }}
        onSaved={refreshLog}
        editEntry={editingSupplement}
      />
      <SupplementEditModal
        open={editModalOpen}
        supplement={selectedSupplement}
        onClose={() => setEditModalOpen(false)}
        onEdit={handleEditSupplement}
        onDeleted={refreshLog}
      />

      <PlanCompletionModal open={showPlanComplete} onClose={() => setShowPlanComplete(false)} />

      {/* Post-Event Feedback Modal */}
      {expiredEventPlan && (
        <PostEventFeedbackModal
          open={showEventFeedback}
          onClose={() => setShowEventFeedback(false)}
          expiredPlan={expiredEventPlan}
          onExtend={() => setEventExtendSheet(true)}
        />
      )}
      <EventPlanConfigSheet open={eventExtendSheet} onOpenChange={setEventExtendSheet} />

      {/* One-time planner setup modal */}
      <Dialog open={showPlannerModal} onOpenChange={(open) => {
        if (!open) {
          scopedSet(plannerDismissKey, 'true');
          setShowPlannerModal(false);
        }
      }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Set up your daily plan</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              To get accurate meals, budget tracking, and calorie guidance — set your budget and meal plan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => { setShowPlannerModal(false); navigate('/planner'); }}>
              Set My Plan
            </Button>
            <Button variant="ghost" onClick={() => {
              scopedSet(plannerDismissKey, 'true');
              setShowPlannerModal(false);
            }}>
              Do it later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
