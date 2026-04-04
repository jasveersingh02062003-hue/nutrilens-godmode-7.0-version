import { useEffect } from 'react';

const MOBILE_EASE = [0.22, 1, 0.36, 1] as const;

export const mobileOverlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const mobileOverlayTransition = {
  duration: 0.16,
  ease: MOBILE_EASE,
};

export const mobileSheetMotion = {
  initial: { y: '8%', opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: '8%', opacity: 0 },
};

export const mobileSheetTransition = {
  duration: 0.2,
  ease: MOBILE_EASE,
};

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;

    const body = document.body;
    const html = document.documentElement;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };

    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';

    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.bodyOverscroll;
      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
    };
  }, [active]);
}