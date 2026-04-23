// Thin wrapper that routes all legacy "Upgrade" CTAs through the new
// PaywallScreen → PlanPicker → PaymentMethodSheet → Processing → Success flow.
// Preserves the original (open / onClose / onUpgraded) prop contract so all
// existing call sites (Profile, CameraHome, MealPlanner, Progress, etc.) keep working.
import PaywallScreen from '@/components/paywall/PaywallScreen';

interface Props {
  open: boolean;
  onClose: () => void;
  onUpgraded?: () => void;
}

export default function UpgradeModal({ open, onClose, onUpgraded }: Props) {
  return <PaywallScreen open={open} onClose={onClose} onUpgraded={onUpgraded} />;
}
