import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'medical_disclaimer_acked_v1';
const RENEW_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface AckRecord {
  ackedAt: number;
  purpose: string;
}

function readAck(): AckRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AckRecord;
  } catch {
    return null;
  }
}

function writeAck(purpose: string) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ackedAt: Date.now(), purpose }),
    );
  } catch {
    /* no-op */
  }
}

/**
 * Gates access to clinical/medical surfaces (blood reports, PCOS, etc.) behind
 * an explicit "I understand this is not medical advice" acknowledgement.
 *
 * Persists the ack locally and writes a row into `consent_records` so we have
 * a server-side audit trail of informed consent (DPDP Act compliance).
 */
export function useMedicalDisclaimer(purpose: string = 'medical_data_view') {
  const [hasAcked, setHasAcked] = useState<boolean>(() => {
    const ack = readAck();
    if (!ack) return false;
    return Date.now() - ack.ackedAt < RENEW_AFTER_MS;
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Re-check on mount in case another tab updated it
  useEffect(() => {
    const ack = readAck();
    setHasAcked(!!ack && Date.now() - ack.ackedAt < RENEW_AFTER_MS);
  }, []);

  /** Run `action` immediately if acked, otherwise show the disclaimer first. */
  const requireAck = useCallback(
    (action: () => void) => {
      if (hasAcked) {
        action();
        return;
      }
      setPendingAction(() => action);
      setModalOpen(true);
    },
    [hasAcked],
  );

  const acknowledge = useCallback(async () => {
    writeAck(purpose);
    setHasAcked(true);
    setModalOpen(false);

    // Best-effort server audit log; never block UX on this.
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('consent_records').insert({
          user_id: user.id,
          purpose,
          granted: true,
          source: 'app_modal',
        });
      }
    } catch (e) {
      console.warn('[medical-disclaimer] consent log failed', e);
    }

    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [purpose, pendingAction]);

  const cancel = useCallback(() => {
    setModalOpen(false);
    setPendingAction(null);
  }, []);

  return { hasAcked, modalOpen, requireAck, acknowledge, cancel };
}
